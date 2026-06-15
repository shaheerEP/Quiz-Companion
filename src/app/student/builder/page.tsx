"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Canvas } from "@react-three/fiber";
import { Sky, MapControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { AlertCircle, Pickaxe, Undo2, Lock, Eraser, Hammer, TreePine } from "lucide-react";
import { motion } from "framer-motion";

type PlacedObject = {
  x: number; y: number; z: number;
  color: string;
  type?: 'block' | 'item';
  itemId?: string;
};

type ToolMode = 'build' | 'items' | 'eraser';

/* ─── 3D Components ─── */

function Ground({ onClick }: { onClick: (x: number, y: number, z: number) => void }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow
      onClick={(e) => { e.stopPropagation(); const p = e.point; onClick(Math.round(p.x), 0, Math.round(p.z)); }}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#4ade80" />
      <gridHelper args={[100, 100, "#22c55e", "#22c55e"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
}

function Block({ data, onClick }: { data: PlacedObject, onClick: (obj: PlacedObject, faceNormal?: THREE.Vector3) => void }) {
  return (
    <mesh position={[data.x, data.y, data.z]} castShadow receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(data, e.face?.normal); }}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}

function ItemObject({ data, itemDef, onClick }: { data: PlacedObject, itemDef: any, onClick: (obj: PlacedObject) => void }) {
  const w = itemDef?.width ?? 1;
  const h = itemDef?.height ?? 1;
  const d = itemDef?.depth ?? 1;
  // Position the item so its base sits on the ground (y=0 means bottom of item is at y=-0.5)
  const yPos = data.y + (h / 2) - 0.5;

  // Pick a color based on item type for the 3D box representation
  const itemColors: Record<string, string> = {
    tree: "#2d6a4f", flower: "#e76f51", car: "#457b9d", lamp: "#e9c46a", fence: "#8d6346",
  };
  const boxColor = itemColors[data.itemId || ""] || "#9ca3af";

  return (
    <group position={[data.x, yPos, data.z]}
      onClick={(e) => { e.stopPropagation(); onClick(data); }}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
      {/* Emoji label floating above the item */}
      <Html position={[0, h / 2 + 0.3, 0]} center distanceFactor={8}
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ fontSize: '24px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          {itemDef?.emoji || "📦"}
        </div>
      </Html>
    </group>
  );
}

/* ─── Main Component ─── */

export default function VoxelBuilder() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeColor, setActiveColor] = useState<string>("#8B5A2B");
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'error'|'success'} | null>(null);
  const [undosRemaining, setUndosRemaining] = useState(3);
  const [sessionPlaced, setSessionPlaced] = useState<PlacedObject[]>([]);
  const isSavingRef = useRef(false);

  const [toolMode, setToolMode] = useState<ToolMode>('build');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  /* ─── Data Fetching ─── */

  const fetchData = async () => {
    if (!user) return;
    try {
      const [studentRes, settingsRes] = await Promise.all([fetch("/api/students"), fetch("/api/settings")]);
      const students = await studentRes.json();
      const currentStudent = students.find((s: any) => s._id === user.id);
      const config = await settingsRes.json();
      setSettings(config);
      if (currentStudent && !isSavingRef.current) {
        setStudentData(currentStudent);
        setObjects(currentStudent.worldBlocks || []);
        if (config?.builderColors?.length > 0 && !activeColor) {
          const first = config.builderColors.find((c: any) => c.cost === 0 || currentStudent.inventory?.includes(c.id));
          if (first) setActiveColor(first.color);
        }
      }
    } catch (e) {} finally { if (!isSavingRef.current) setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, [user]);

  const showMessage = (text: string, type: 'error'|'success') => {
    setActionMessage({ text, type }); setTimeout(() => setActionMessage(null), 3000);
  };

  const blockCost = settings?.builderBlockCost ?? 50;
  const blockRefund = settings?.builderBlockRefund ?? 0;
  const shopColors = settings?.builderColors ?? [];
  const shopItems: any[] = settings?.builderItems ?? [];

  /* ─── Save helper ─── */

  const saveObjects = async (newObjects: PlacedObject[], newBalance: number, desc: string, pointsDeducted: number) => {
    isSavingRef.current = true;
    try {
      const res = await fetch("/api/students", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, pointsBalance: newBalance, worldBlocks: newObjects })
      });
      if (!res.ok) throw new Error("Save failed");
      if (pointsDeducted > 0) {
        await fetch("/api/withdrawals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: user?.id, pointsDeducted, rewardDescription: desc })
        });
      }
      setTimeout(() => { isSavingRef.current = false; }, 500);
    } catch (e) { isSavingRef.current = false; showMessage("Failed to save. Check connection.", "error"); fetchData(); }
  };

  /* ─── Click Handlers ─── */

  const handleGroundClick = (x: number, y: number, z: number) => {
    if (toolMode === 'eraser') return; // nothing to erase on ground
    if (toolMode === 'build') placeBlock(x, y, z);
    if (toolMode === 'items') placeItem(x, y, z);
  };

  const handleBlockClick = (obj: PlacedObject, faceNormal?: THREE.Vector3) => {
    if (toolMode === 'eraser') { eraseObject(obj); return; }
    if (!faceNormal) return;
    const nx = obj.x + faceNormal.x;
    const ny = obj.y + faceNormal.y;
    const nz = obj.z + faceNormal.z;
    if (toolMode === 'build') placeBlock(nx, ny, nz);
    if (toolMode === 'items') placeItem(nx, ny, nz);
  };

  const handleItemClick = (obj: PlacedObject) => {
    if (toolMode === 'eraser') { eraseObject(obj); return; }
    // If clicking an item in non-eraser mode, place adjacent on ground level
    if (toolMode === 'build') placeBlock(obj.x + 1, 0, obj.z);
    if (toolMode === 'items') placeItem(obj.x + 1, 0, obj.z);
  };

  /* ─── Place Block ─── */

  const placeBlock = (x: number, y: number, z: number) => {
    if (!studentData) return;
    if (objects.some(o => o.x === x && o.y === y && o.z === z)) return;
    if (studentData.pointsBalance < blockCost) { showMessage(`Need ${blockCost} pts!`, "error"); return; }

    const obj: PlacedObject = { x, y, z, color: activeColor, type: 'block' };
    const newObjects = [...objects, obj];
    const newBalance = studentData.pointsBalance - blockCost;
    setObjects(newObjects);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    const newSession = [...sessionPlaced, obj].slice(-3);
    setSessionPlaced(newSession);
    setUndosRemaining(newSession.length);
    saveObjects(newObjects, newBalance, "Placed a block in World Builder", blockCost);
  };

  /* ─── Place Item ─── */

  const placeItem = (x: number, y: number, z: number) => {
    if (!studentData || !activeItemId) { showMessage("Select an item first!", "error"); return; }
    const itemDef = shopItems.find((i: any) => i.id === activeItemId);
    if (!itemDef) return;
    if (objects.some(o => o.x === x && o.y === y && o.z === z)) return;
    if (studentData.pointsBalance < itemDef.cost) { showMessage(`Need ${itemDef.cost} pts for ${itemDef.name}!`, "error"); return; }

    const obj: PlacedObject = { x, y, z, color: '', type: 'item', itemId: activeItemId };
    const newObjects = [...objects, obj];
    const newBalance = studentData.pointsBalance - itemDef.cost;
    setObjects(newObjects);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    const newSession = [...sessionPlaced, obj].slice(-3);
    setSessionPlaced(newSession);
    setUndosRemaining(newSession.length);
    saveObjects(newObjects, newBalance, `Placed ${itemDef.name} in World Builder`, itemDef.cost);
  };

  /* ─── Erase ─── */

  const eraseObject = (obj: PlacedObject) => {
    if (!studentData) return;
    const newObjects = objects.filter(o => o.x !== obj.x || o.y !== obj.y || o.z !== obj.z);
    let refund = 0;
    if (obj.type === 'item' && obj.itemId) {
      const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
      refund = itemDef?.refundOnErase ?? 0;
    } else {
      refund = blockRefund;
    }
    const newBalance = studentData.pointsBalance + refund;
    setObjects(newObjects);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    showMessage(refund > 0 ? `Erased! +${refund} pts refunded.` : "Erased!", "success");
    saveObjects(newObjects, newBalance, refund > 0 ? `Erased object, refunded ${refund} pts` : "Erased object", 0);
  };

  /* ─── Undo ─── */

  const handleUndo = () => {
    if (undosRemaining <= 0 || sessionPlaced.length === 0) { showMessage("No undos available.", "error"); return; }
    const last = sessionPlaced[sessionPlaced.length - 1];
    const newObjects = objects.filter(o => o.x !== last.x || o.y !== last.y || o.z !== last.z);
    let refund = blockCost;
    if (last.type === 'item' && last.itemId) {
      const itemDef = shopItems.find((i: any) => i.id === last.itemId);
      refund = itemDef?.cost ?? 0;
    }
    const newBalance = studentData.pointsBalance + refund;
    const newSession = sessionPlaced.slice(0, -1);
    setObjects(newObjects);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    setSessionPlaced(newSession);
    setUndosRemaining(prev => prev - 1);
    showMessage(`Undone! +${refund} pts refunded.`, "success");
    saveObjects(newObjects, newBalance, `Undo: refunded ${refund} pts`, 0);
  };

  /* ─── Buy Color ─── */

  const handleBuyColor = async (colorObj: any) => {
    if (studentData.pointsBalance < colorObj.cost) { showMessage(`Need ${colorObj.cost} pts!`, "error"); return; }
    isSavingRef.current = true;
    const newBalance = studentData.pointsBalance - colorObj.cost;
    const newInventory = [...(studentData.inventory || []), colorObj.id];
    setStudentData({ ...studentData, pointsBalance: newBalance, inventory: newInventory });
    setActiveColor(colorObj.color);
    showMessage(`Unlocked ${colorObj.name}!`, "success");
    try {
      await fetch("/api/students", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, pointsBalance: newBalance, inventory: newInventory }) });
      await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user?.id, pointsDeducted: colorObj.cost, rewardDescription: `Unlocked Builder Color: ${colorObj.name}` }) });
      setTimeout(() => { isSavingRef.current = false; }, 500);
    } catch (e) { isSavingRef.current = false; showMessage("Failed to unlock.", "error"); fetchData(); }
  };

  /* ─── Render Guards ─── */

  if (!user || user.role !== "student") return null;
  if (loading && !studentData) return (
    <div className="min-h-screen bg-sky-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
    </div>
  );

  const cursorClass = toolMode === 'eraser' ? 'cursor-pointer' : 'cursor-crosshair';

  return (
    <div className="h-screen bg-sky-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50"><Navbar /></div>

      {/* ─── Left Panel: Points, Tools, Undo ─── */}
      <div className="absolute top-24 left-4 md:left-6 z-10 flex flex-col gap-3 pointer-events-none">
        {/* Points */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white pointer-events-auto">
          <p className="text-xs text-sky-600 font-bold uppercase tracking-wider">Points</p>
          <p className="text-3xl font-black text-amber-500">{studentData?.pointsBalance || 0}</p>
        </div>

        {/* Tool Selector */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white pointer-events-auto flex flex-col overflow-hidden">
          <button onClick={() => { setToolMode('build'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors ${toolMode === 'build' ? 'bg-sky-500 text-white' : 'text-sky-700 hover:bg-sky-50'}`}>
            <Hammer className="w-4 h-4" /> Build
          </button>
          <button onClick={() => setToolMode('items')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'items' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}>
            <TreePine className="w-4 h-4" /> Items
          </button>
          <button onClick={() => { setToolMode('eraser'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'eraser' ? 'bg-rose-500 text-white' : 'text-rose-600 hover:bg-rose-50'}`}>
            <Eraser className="w-4 h-4" /> Eraser
          </button>
        </div>

        {/* Undo */}
        <button onClick={handleUndo} disabled={undosRemaining <= 0 || sessionPlaced.length === 0}
          className={`p-3 rounded-xl font-bold flex items-center justify-center gap-2 pointer-events-auto transition-colors shadow-lg border border-white
            ${(undosRemaining <= 0 || sessionPlaced.length === 0) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white/80 hover:bg-white text-sky-700 backdrop-blur-md'}`}>
          <Undo2 className="w-4 h-4" />
          <span className="text-sm">Undo</span>
          <span className="text-[10px] font-black bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded">{undosRemaining}</span>
        </button>

        {/* Action Message */}
        {actionMessage && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className={`p-3 rounded-xl font-bold flex items-center gap-2 pointer-events-auto text-sm ${actionMessage.type === 'error' ? 'bg-rose-500/90 text-white shadow-lg' : 'bg-emerald-500/90 text-white shadow-lg'}`}>
            <AlertCircle className="w-4 h-4" /> {actionMessage.text}
          </motion.div>
        )}
      </div>

      {/* ─── Bottom Bar: Color Palette / Item Palette ─── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] md:w-auto max-w-3xl z-10 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white flex flex-wrap justify-center items-center gap-3 pointer-events-auto">
        
        {toolMode === 'build' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-sky-200">
              <Pickaxe className="w-4 h-4 text-sky-600" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">Block</span>
                <span className="text-xs font-black text-amber-500">-{blockCost} pts</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1">
              {shopColors.map((b: any) => {
                const isUnlocked = b.cost === 0 || studentData?.inventory?.includes(b.id);
                return (
                  <button key={b.id}
                    onClick={() => { if (isUnlocked) setActiveColor(b.color); else handleBuyColor(b); }}
                    className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeColor === b.color && isUnlocked ? 'border-sky-500 scale-110' : 'border-transparent'} ${!isUnlocked && 'opacity-80'}`}
                    style={{ backgroundColor: b.color }} title={isUnlocked ? b.name : `${b.name} - ${b.cost} pts`}>
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                        <Lock className="w-3 h-3 text-white mb-0.5" />
                        <span className="text-[8px] font-black text-white leading-none">{b.cost}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {toolMode === 'items' && (
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1">
            {shopItems.map((item: any) => (
              <button key={item.id}
                onClick={() => setActiveItemId(item.id)}
                className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                title={`${item.name} — ${item.cost} pts`}>
                <span className="text-2xl leading-none">{item.emoji}</span>
                <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
              </button>
            ))}
          </div>
        )}

        {toolMode === 'eraser' && (
          <div className="flex items-center gap-3 text-rose-600 font-bold text-sm px-2">
            <Eraser className="w-5 h-5" />
            <span>Click any block or item to erase it</span>
            {blockRefund > 0 && <span className="text-emerald-500 text-xs font-black">(blocks: +{blockRefund} pts)</span>}
          </div>
        )}
      </div>

      {/* ─── Instructions (Desktop only) ─── */}
      <div className="hidden md:block absolute top-24 right-6 z-10 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white text-sm font-bold text-sky-800 max-w-[200px] pointer-events-auto">
        <p className="mb-2">🖱️ Left Click + Drag to pan</p>
        <p className="mb-2">🖱️ Right Click + Drag to rotate</p>
        <p className="mb-2">🖱️ Scroll to zoom at cursor</p>
        <p>🖱️ Click grid or object to {toolMode === 'eraser' ? 'erase' : 'place'}</p>
      </div>

      {/* ─── 3D Canvas ─── */}
      <main className={`flex-1 w-full h-full ${cursorClass}`}>
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
          
          <Ground onClick={handleGroundClick} />
          
          {objects.map((obj, idx) => {
            if (obj.type === 'item') {
              const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
              return <ItemObject key={idx} data={obj} itemDef={itemDef} onClick={handleItemClick} />;
            }
            return <Block key={idx} data={obj} onClick={handleBlockClick} />;
          })}

          <MapControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  );
}
