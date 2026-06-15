"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Canvas, useThree } from "@react-three/fiber";
import { Sky, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Cuboid, AlertCircle, Pickaxe, Undo2, Lock, Unlock } from "lucide-react";
import { motion } from "framer-motion";

type BlockData = { x: number; y: number; z: number; color: string };

function Ground({ onPlaceBlock }: { onPlaceBlock: (x: number, y: number, z: number) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        const { point } = e;
        const x = Math.round(point.x);
        const y = Math.round(point.y + 0.5); // Place on top
        const z = Math.round(point.z);
        onPlaceBlock(x, y, z);
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#4ade80" />
      <gridHelper args={[100, 100, "#22c55e", "#22c55e"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
}

function Block({ position, color, onPlaceBlock }: { position: [number, number, number], color: string, onPlaceBlock: (x: number, y: number, z: number) => void }) {
  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        const faceIndex = e.face?.normal;
        if (!faceIndex) return;
        
        // Calculate new block position based on face normal
        const x = position[0] + faceIndex.x;
        const y = position[1] + faceIndex.y;
        const z = position[2] + faceIndex.z;
        onPlaceBlock(x, y, z);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} transparent={color === "#ADD8E6"} opacity={color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}

export default function VoxelBuilder() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeColor, setActiveColor] = useState<string>("#8B5A2B");
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'error'|'success'} | null>(null);
  const [undosRemaining, setUndosRemaining] = useState(3);
  const [sessionPlacedBlocks, setSessionPlacedBlocks] = useState<BlockData[]>([]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [studentRes, settingsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/settings")
      ]);
      const students = await studentRes.json();
      const currentStudent = students.find((s: any) => s._id === user.id);
      
      const config = await settingsRes.json();
      setSettings(config);

      if (currentStudent) {
        setStudentData(currentStudent);
        setBlocks(currentStudent.worldBlocks || []);
        
        // Set default active color if none selected and config is loaded
        if (config?.builderColors?.length > 0) {
           const firstUnlocked = config.builderColors.find((c: any) => c.cost === 0 || currentStudent.inventory?.includes(c.id));
           if (firstUnlocked && !activeColor) {
             setActiveColor(firstUnlocked.color);
           }
        }
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const showMessage = (text: string, type: 'error'|'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const blockCost = settings?.builderBlockCost ?? 50;
  const shopColors = settings?.builderColors ?? [];

  const handlePlaceBlock = async (x: number, y: number, z: number) => {
    if (!studentData) return;
    
    // Check if block already exists there
    if (blocks.some(b => b.x === x && b.y === y && b.z === z)) return;

    if (studentData.pointsBalance < blockCost) {
      showMessage(`Not enough points! Need ${blockCost} pts.`, "error");
      return;
    }

    const newBlock = { x, y, z, color: activeColor };
    const newBlocks = [...blocks, newBlock];
    const newBalance = studentData.pointsBalance - blockCost;

    // Optimistic update
    setBlocks(newBlocks);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    setSessionPlacedBlocks([...sessionPlacedBlocks, newBlock]);

    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          pointsBalance: newBalance,
          worldBlocks: newBlocks
        })
      });

      if (!res.ok) throw new Error("Failed to save");

      await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.id,
          pointsDeducted: blockCost,
          rewardDescription: "Placed a block in World Builder"
        })
      });

    } catch (e) {
      showMessage("Failed to place block. Check connection.", "error");
      fetchData();
    }
  };

  const handleUndo = async () => {
    if (undosRemaining <= 0 || sessionPlacedBlocks.length === 0) {
      showMessage("No undos available.", "error");
      return;
    }

    const lastBlock = sessionPlacedBlocks[sessionPlacedBlocks.length - 1];
    const newBlocks = blocks.filter(b => b.x !== lastBlock.x || b.y !== lastBlock.y || b.z !== lastBlock.z);
    const newSessionBlocks = sessionPlacedBlocks.slice(0, -1);
    const newBalance = studentData.pointsBalance + blockCost;
    
    setBlocks(newBlocks);
    setSessionPlacedBlocks(newSessionBlocks);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    setUndosRemaining(prev => prev - 1);
    showMessage("Block undone! Points refunded.", "success");

    try {
      await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          pointsBalance: newBalance,
          worldBlocks: newBlocks
        })
      });
      // We could log a refund history event here if we wanted
    } catch (e) {
      showMessage("Failed to sync undo. Check connection.", "error");
      fetchData();
    }
  };

  const handleBuyColor = async (colorObj: any) => {
    if (studentData.pointsBalance < colorObj.cost) {
      showMessage(`Need ${colorObj.cost} pts to unlock this color!`, "error");
      return;
    }

    const newBalance = studentData.pointsBalance - colorObj.cost;
    const newInventory = [...(studentData.inventory || []), colorObj.id];

    setStudentData({ ...studentData, pointsBalance: newBalance, inventory: newInventory });
    setActiveColor(colorObj.color);
    showMessage(`Unlocked ${colorObj.name}!`, "success");

    try {
      await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          pointsBalance: newBalance,
          inventory: newInventory
        })
      });

      await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.id,
          pointsDeducted: colorObj.cost,
          rewardDescription: `Unlocked Builder Color: ${colorObj.name}`
        })
      });
    } catch (e) {
      showMessage("Failed to unlock. Check connection.", "error");
      fetchData();
    }
  };

  if (!user || user.role !== "student") return null;

  if (loading && !studentData) {
    return (
      <div className="min-h-screen bg-sky-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-sky-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      <div className="absolute top-24 left-4 md:left-6 z-10 flex flex-col gap-4 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white flex flex-col gap-1 pointer-events-auto">
          <p className="text-xs text-sky-600 font-bold uppercase tracking-wider">Points Balance</p>
          <p className="text-3xl font-black text-amber-500">{studentData?.pointsBalance || 0} pts</p>
        </div>

        <button 
          onClick={handleUndo}
          disabled={undosRemaining <= 0 || sessionPlacedBlocks.length === 0}
          className={`p-3 rounded-xl font-bold flex items-center justify-center gap-2 pointer-events-auto transition-colors shadow-lg border border-white
            ${(undosRemaining <= 0 || sessionPlacedBlocks.length === 0) 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-white/80 hover:bg-white text-sky-700 backdrop-blur-md'}`}
        >
          <Undo2 className="w-5 h-5" />
          <span>Undo Block</span>
          <span className="text-xs font-black bg-sky-100 text-sky-600 px-2 py-1 rounded-md">{undosRemaining} left</span>
        </button>

        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 rounded-xl font-bold flex items-center gap-2 pointer-events-auto ${actionMessage.type === 'error' ? 'bg-rose-500/90 text-white shadow-lg' : 'bg-emerald-500/90 text-white shadow-lg'}`}
          >
            <AlertCircle className="w-5 h-5" />
            {actionMessage.text}
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-auto max-w-2xl z-10 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white flex flex-wrap justify-center items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2 pr-4 border-r border-sky-200">
          <Pickaxe className="w-5 h-5 text-sky-600" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Build Cost</span>
            <span className="text-sm font-black text-amber-500">-{blockCost} pts</span>
          </div>
        </div>
        
        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1 px-1">
          {shopColors.map((b: any) => {
            const isUnlocked = b.cost === 0 || studentData?.inventory?.includes(b.id);
            return (
              <button 
                key={b.id}
                onClick={() => {
                  if (isUnlocked) setActiveColor(b.color);
                  else handleBuyColor(b);
                }}
                className={`relative shrink-0 w-12 h-12 rounded-xl border-4 transition-transform hover:scale-110 shadow-sm ${activeColor === b.color && isUnlocked ? 'border-sky-500 scale-110' : 'border-transparent'} ${!isUnlocked && 'opacity-60 grayscale'}`}
                style={{ backgroundColor: b.color }}
                title={isUnlocked ? b.name : `${b.name} - ${b.cost} pts`}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block absolute top-24 right-6 z-10 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white text-sm font-bold text-sky-800 max-w-[200px] pointer-events-auto">
        <p className="mb-2">🖱️ Left Click + Drag to rotate camera</p>
        <p className="mb-2">🖱️ Right Click + Drag to pan</p>
        <p>🖱️ Click grid or block to build</p>
      </div>

      <main className="flex-1 w-full h-full cursor-crosshair">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
          
          <Ground onPlaceBlock={handlePlaceBlock} />
          
          {blocks.map((block, idx) => (
            <Block 
              key={idx} 
              position={[block.x, block.y, block.z]} 
              color={block.color} 
              onPlaceBlock={handlePlaceBlock} 
            />
          ))}

          <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  );
}
