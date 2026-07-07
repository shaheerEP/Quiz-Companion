"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, MapControls, Html, Text, BakeShadows, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { AlertCircle, Pickaxe, Undo2, Lock, Eraser, Hammer, TreePine, PaintBucket, Triangle, Info, RotateCw, Share2, Gamepad2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, LogIn, LogOut, MousePointer2, Copy, Box, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { Player, usePlayerKeyboardControls, MobileDPad, playerState } from '@/components/Player';
import { CameraBounds } from "@/components/CameraBounds";
import { getCurvedGeometry, getRoofGeometry, getWedgeGeometry, getPyramidGeometry } from "@/components/BlockGeometries";
import { GroupGizmo } from "./GroupGizmo";

// Returns true if the pointer moved enough to be considered a drag
const DRAG_THRESHOLD = 10; // px

export type PlacedObject = {
  x: number; y: number; z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  thickness?: number;
  depth?: number;
  w?: number; d?: number; h?: number;
  width?: number;
  curveness?: number;
  blockShape?: 'box' | 'wedge' | 'pyramid';
  isOpen?: boolean;
  materialType?: 'color' | 'texture' | 'glass';
  textureId?: string;
};

export type Prefab = {
  id: string;
  name: string;
  emoji: string;
  objects: PlacedObject[];
};

type ToolMode = 'build' | 'items' | 'eraser' | 'roof' | 'paint' | 'rotate' | 'select' | 'prefab';

const BASE_COLORS = [
  { id: "wood", color: "#8B5A2B", name: "Wood" },
  { id: "stone", color: "#808080", name: "Stone" },
  { id: "brick", color: "#B22222", name: "Brick" },
  { id: "glass", color: "#ADD8E6", name: "Glass" },
];

export const AVAILABLE_TEXTURES = [
  { id: "wood", url: "/textures/wood.png", name: "Wood Planks" },
  { id: "stone", url: "/textures/stone.png", name: "Stone Masonry" },
  { id: "brick", url: "/textures/brick.png", name: "Red Brick" },
  { id: "shingles", url: "/textures/shingles.png", name: "Roof Shingles" },
  { id: "tile", url: "/textures/tile.png", name: "Tile" },
];

const AVAILABLE_AVATARS = [
  { id: 'boy', name: 'Boy', cost: 0, icon: '👦' },
  { id: 'knight', name: 'Knight', cost: 500, icon: '🛡️' },
  { id: 'robot', name: 'Robot', cost: 500, icon: '🤖' },
];

/* ─── 3D Components ─── */

const textureLoader = typeof window !== 'undefined' ? new THREE.TextureLoader() : null;
const TEXTURES: Record<string, THREE.Texture | null> = {};
if (typeof window !== 'undefined') {
  TEXTURES.wood = textureLoader!.load('/textures/wood.png');
  TEXTURES.stone = textureLoader!.load('/textures/stone.png');
  TEXTURES.brick = textureLoader!.load('/textures/brick.png');
  TEXTURES.shingles = textureLoader!.load('/textures/shingles.png');
  TEXTURES.tile = textureLoader!.load('/textures/tile.png');
  Object.values(TEXTURES).forEach(t => { if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } });
}

/* ─── 3D Components ─── */

function Ground({ landSize, onClick, isDragging }: { landSize: number, onClick: (x: number, y: number, z: number) => void, isDragging: () => boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow
      onClick={(e) => { if (isDragging()) return; e.stopPropagation(); const p = e.point; onClick(Math.round(p.x), 0, Math.round(p.z)); }}>
      <planeGeometry args={[landSize, landSize]} />
      <meshStandardMaterial color="#4ade80" />
      <gridHelper args={[landSize, landSize, "#22c55e", "#22c55e"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
}

function Block({ data, onClick, isDragging, isSelected }: { data: PlacedObject, onClick: (obj: PlacedObject, faceNormal?: THREE.Vector3, point?: THREE.Vector3) => void, isDragging: () => boolean, isSelected?: boolean }) {
  const thickness = data.thickness || 1;
  const depth = data.depth || 1;
  const rotationY = data.rotationY || 0;
  return (
    <mesh position={[data.x, data.y - 0.5 + thickness / 2, data.z]} rotation={[0, rotationY, 0]} castShadow receiveShadow
      onClick={(e) => { if (isDragging()) return; e.stopPropagation(); onClick(data, e.face?.normal, e.point); }}>
      <boxGeometry args={[1, thickness, depth]} />
      <meshStandardMaterial 
        color={data.color} 
        transparent={data.color === "#ADD8E6"} 
        opacity={data.color === "#ADD8E6" ? 0.6 : 1}
      />
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.05, thickness + 0.05, depth + 0.05]} />
          <meshBasicMaterial color="#ef4444" wireframe />
        </mesh>
      )}
    </mesh>
  );
}

function RoofBlock({ data, onClick, isDragging }: { data: PlacedObject, onClick: (obj: PlacedObject, faceNormal?: THREE.Vector3, point?: THREE.Vector3) => void, isDragging: () => boolean }) {
  return (
    <mesh position={[data.x, data.y, data.z]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow
      onClick={(e) => { if (isDragging()) return; e.stopPropagation(); onClick(data, e.face?.normal, e.point); }}>
      <coneGeometry args={[0.71, 1, 4]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}


function LargeRoofBlock({ data, onClick, isDragging }: { data: PlacedObject, onClick: (obj: PlacedObject, faceNormal?: THREE.Vector3, point?: THREE.Vector3) => void, isDragging: () => boolean }) {
  const { w = 1, h = 1, d = 1 } = data;

  return (
    <mesh position={[data.x, data.y, data.z]} castShadow receiveShadow
      onClick={(e) => { if (isDragging()) return; e.stopPropagation(); onClick(data, e.face?.normal, e.point); }}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}

function InteractiveDoor({ data, handleClick, isExploreMode }: { data: PlacedObject; handleClick: any; isExploreMode?: boolean }) {
  const [isOpen, setIsOpen] = useState(data.isOpen || false);
  const [showUI, setShowUI] = useState(false);
  const vec = useRef(new THREE.Vector3());

  useFrame((state) => {
    const doorPos = vec.current.set(data.x, data.y, data.z);
    const dist = state.camera.position.distanceTo(doorPos);
    if (dist < 3.5 && isExploreMode) {
      if (!showUI) setShowUI(true);
    } else {
      if (showUI) setShowUI(false);
    }
  });

  const handleToggle = (e: any) => {
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    data.isOpen = newIsOpen;
  };

  const handleDoubleClick = (e: any) => {
    if (!isExploreMode) return;
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    data.isOpen = newIsOpen;
  };

  const baseRotation = data.rotationY || 0;
  const swing = isOpen ? Math.PI / 2 : 0;

  return (
    <group position={[data.x, data.y - 0.5, data.z]} rotation={[0, baseRotation, 0]} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      <group position={[-0.4, 0, 0]} rotation={[0, swing, 0]}>
        <mesh position={[0.4, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 1.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0.7, 0.9, 0.08]} castShadow receiveShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        
        {showUI && (
          <Html position={[0.4, 1.2, 0.2]} center zIndexRange={[100, 0]}>
            <button 
              onClick={handleToggle}
              className="bg-sky-600/90 text-white text-xs font-bold px-3 py-2 rounded-lg pointer-events-auto hover:bg-sky-500 whitespace-nowrap shadow-xl border border-sky-300 transition-all cursor-pointer"
            >
              {isOpen ? "Close Door" : "Open Door"}
            </button>
          </Html>
        )}
      </group>
    </group>
  );
}

function InteractiveVehicle({ data, onEnterVehicle, isExploreMode, children }: { data: PlacedObject; onEnterVehicle: () => void; isExploreMode?: boolean; children: React.ReactNode }) {
  const [showUI, setShowUI] = useState(false);
  const vec = useRef(new THREE.Vector3());

  useFrame((state) => {
    const vPos = vec.current.set(data.x, data.y, data.z);
    const dist = state.camera.position.distanceTo(vPos);
    if (dist < 8 && isExploreMode) {
      if (!showUI) setShowUI(true);
    } else {
      if (showUI) setShowUI(false);
    }
  });

  return (
    <group>
      {children}
      {showUI && (
        <Html position={[data.x, data.y + 1.5, data.z]} center zIndexRange={[100, 0]}>
          <button 
            onClick={(e) => { e.stopPropagation(); onEnterVehicle(); }}
            className="bg-amber-500 text-white p-2.5 rounded-full pointer-events-auto hover:bg-amber-400 shadow-xl border-2 border-white transition-transform hover:scale-110 cursor-pointer"
            title="Enter Vehicle"
          >
            <LogIn className="w-6 h-6" />
          </button>
        </Html>
      )}
    </group>
  );
}

function ItemObject({ data, itemDef, onClick, isDragging, onEnterVehicle, isExploreMode }: { data: PlacedObject, itemDef: any, onClick: (obj: PlacedObject) => void, isDragging: () => boolean, onEnterVehicle?: () => void, isExploreMode?: boolean }) {
  const w = itemDef?.width ?? 1;
  const h = itemDef?.height ?? 1;
  const d = itemDef?.depth ?? 1;
  // Position the item so its base sits on the ground (y=0 means bottom of item is at y=-0.5)
  const yPos = data.y + (h / 2) - 0.5;

  const handleClick = (e: any) => {
    if (isDragging()) return;
    e.stopPropagation();
    onClick(data);
  };

  const itemId = data.itemId || "";
  const isVehicle = ['car', 'lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'].includes(itemId);

  const wrapIfVehicle = (node: React.ReactNode) => {
    if (isVehicle && onEnterVehicle) {
      return <InteractiveVehicle data={data} onEnterVehicle={onEnterVehicle} isExploreMode={isExploreMode}>{node}</InteractiveVehicle>;
    }
    return node;
  };

  // Helper to wrap custom geometry
  const ModelWrapper = ({ children }: { children: React.ReactNode }) => (
    <group position={[data.x, data.y - 0.5, data.z]} rotation={[0, data.rotationY || 0, 0]} onClick={handleClick}>
      {children}
    </group>
  );

  const renderAnimal = (bodyColor: string, bodyArgs: [number,number,number], headColor: string, headArgs: [number,number,number], headPos: [number,number,number], legColor: string, legArgs: [number,number,number], hasHorns?: boolean, hornColor?: string) => {
    const [bw, bh, bd] = bodyArgs;
    const [lw, lh, ld] = legArgs;
    const legX = bw/2 - lw/2;
    const legZ = bd/2 - ld/2;
    const bodyY = lh + bh/2;
    
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
          <boxGeometry args={bodyArgs} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        {/* Head */}
        <mesh position={headPos} castShadow receiveShadow>
          <boxGeometry args={headArgs} />
          <meshStandardMaterial color={headColor} />
        </mesh>
        {/* Legs */}
        {[
          [-legX, lh/2, legZ], [legX, lh/2, legZ],
          [-legX, lh/2, -legZ], [legX, lh/2, -legZ]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={legArgs} />
            <meshStandardMaterial color={legColor} />
          </mesh>
        ))}
        {/* Horns */}
        {hasHorns && (
          <>
            <mesh position={[headPos[0] - 0.2, headPos[1] + headArgs[1]/2 + 0.1, headPos[2]]} castShadow receiveShadow>
              <coneGeometry args={[0.05, 0.3, 4]} />
              <meshStandardMaterial color={hornColor || "#e5e7eb"} />
            </mesh>
            <mesh position={[headPos[0] + 0.2, headPos[1] + headArgs[1]/2 + 0.1, headPos[2]]} castShadow receiveShadow>
              <coneGeometry args={[0.05, 0.3, 4]} />
              <meshStandardMaterial color={hornColor || "#e5e7eb"} />
            </mesh>
          </>
        )}
      </ModelWrapper>
    );
  };

  const name = itemDef?.name?.toLowerCase() || "";
  const emoji = itemDef?.emoji || "";
  const isMatch = (...args: string[]) => args.filter(a => a !== "").some(a => {
    if (itemId === a || emoji === a) return true;
    const lowerA = a.toLowerCase();
    const lowerName = name.toLowerCase();
    // Use word-boundary matching so "bench" doesn't match "park bench"
    const re = new RegExp(`(^|\\s)${lowerA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i');
    return lowerName === lowerA || re.test(lowerName);
  });

  if (isMatch("street_light", "street light", "💡")) {
    return (
      <ModelWrapper>
        {/* Base */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.3, 0.5, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        {/* Pole */}
        <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.1, 2.5, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        {/* Lamp */}
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshPhysicalMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={2} transmission={0.9} />
        </mesh>
        <pointLight position={[0, 3.2, 0]} intensity={1} distance={5} color="#fef08a" />
      </ModelWrapper>
    );
  }

  if (isMatch("fountain", "fountain", "⛲")) {
    return (
      <ModelWrapper>
        {/* Base Pool - octagonal */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.4, 1.5, 0.3, 8]} />
          <meshStandardMaterial color="#78716c" />
        </mesh>
        {/* Inner Pool Wall */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.2, 0.15, 8]} />
          <meshStandardMaterial color="#a8a29e" />
        </mesh>
        {/* Water in Base */}
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <cylinderGeometry args={[1.15, 1.15, 0.1, 16]} />
          <meshPhysicalMaterial color="#38bdf8" transmission={0.9} opacity={0.7} transparent />
        </mesh>
        {/* Center Pillar - fluted */}
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.25, 1.2, 12]} />
          <meshStandardMaterial color="#e7e5e4" />
        </mesh>
        {/* Middle Bowl */}
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.15, 0.15, 12]} />
          <meshStandardMaterial color="#a8a29e" />
        </mesh>
        {/* Upper Pillar */}
        <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.5, 8]} />
          <meshStandardMaterial color="#e7e5e4" />
        </mesh>
        {/* Top Finial */}
        <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
        {/* Water Streams - cascading down */}
        {[0, 1, 2, 3].map(i => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh key={`stream-${i}`} position={[Math.cos(angle) * 0.3, 1.3, Math.sin(angle) * 0.3]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
              <meshPhysicalMaterial color="#7dd3fc" transmission={0.8} opacity={0.5} transparent />
            </mesh>
          );
        })}
        <pointLight position={[0, 1.5, 0]} intensity={0.3} distance={4} color="#bae6fd" />
      </ModelWrapper>
    );
  }

  if (isMatch("park_bench", "park bench")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.1, 0.8]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
        <mesh position={[0, 0.9, -0.35]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.5, 0.1]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
        {/* Iron Legs */}
        {[[-0.9, 0.2, -0.3], [0.9, 0.2, -0.3], [-0.9, 0.2, 0.3], [0.9, 0.2, 0.3]].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.4]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("gazebo", "gazebo", "🛖")) {
    return (
      <ModelWrapper>
        {/* Base */}
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.0, 2.0, 0.2, 8]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
        {/* Pillars */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i * Math.PI) / 4;
          return (
            <mesh key={i} position={[Math.cos(angle)*1.8, 1.5, Math.sin(angle)*1.8]} castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.08, 2.8, 8]} />
              <meshStandardMaterial color="#f3f4f6" />
            </mesh>
          )
        })}
        {/* Roof */}
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <coneGeometry args={[2.2, 1.5, 8]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("fire_pit", "fire pit", "🔥")) {
    return (
      <ModelWrapper>
        {/* Stone Ring */}
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.6, 0.2, 8, 16]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
        {/* Logs */}
        <group position={[0, 0.2, 0]} rotation={[0, Math.PI/4, 0]}>
          <mesh rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
        <group position={[0, 0.2, 0]} rotation={[0, -Math.PI/4, 0]}>
          <mesh rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
        {/* Fire */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <coneGeometry args={[0.4, 0.6, 8]} />
          <meshPhysicalMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={2} transparent opacity={0.8} />
        </mesh>
        <pointLight position={[0, 1, 0]} intensity={1.5} distance={5} color="#fb923c" />
      </ModelWrapper>
    );
  }

  if (isMatch("picnic_table", "picnic table")) {
    return (
      <ModelWrapper>
        {/* Table Top */}
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.1, 0.8]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
        {/* Benches */}
        <mesh position={[0, 0.4, 0.7]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[0, 0.4, -0.7]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
        {/* Legs */}
        <mesh position={[-0.8, 0.4, 0]} rotation={[0, 0, Math.PI/6]} castShadow receiveShadow>
           <boxGeometry args={[0.1, 1.0, 1.4]} />
           <meshStandardMaterial color="#92400e" />
        </mesh>
        <mesh position={[0.8, 0.4, 0]} rotation={[0, 0, -Math.PI/6]} castShadow receiveShadow>
           <boxGeometry args={[0.1, 1.0, 1.4]} />
           <meshStandardMaterial color="#92400e" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("hedge", "hedge", "🌿")) {
    return (
      <ModelWrapper>
        {/* Main body */}
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 1.0, 0.6]} />
          <meshStandardMaterial color="#166534" />
        </mesh>
        {/* Rounded top bumps */}
        {[[-0.5, 1.1, 0], [0, 1.15, 0], [0.5, 1.1, 0]].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
        ))}
        {/* Small leaf bumps on sides */}
        {[[-0.7, 0.6, 0.25], [0.7, 0.6, -0.25], [-0.3, 0.5, 0.3], [0.3, 0.5, -0.3]].map((pos, i) => (
          <mesh key={`leaf-${i}`} position={pos as [number,number,number]} castShadow>
            <sphereGeometry args={[0.18, 6, 6]} />
            <meshStandardMaterial color="#14532d" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("bird_bath", "bird bath")) {
    return (
      <ModelWrapper>
        {/* Square Base */}
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <meshStandardMaterial color="#a8a29e" />
        </mesh>
        {/* Decorative Pillar */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.7, 12]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
        {/* Pillar Ring */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 12]} />
          <meshStandardMaterial color="#e7e5e4" />
        </mesh>
        {/* Wide Shallow Bowl */}
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.12, 0.12, 16]} />
          <meshStandardMaterial color="#d4d4d8" />
        </mesh>
        {/* Bowl Rim */}
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.5, 0.03, 8, 24]} />
          <meshStandardMaterial color="#a8a29e" />
        </mesh>
        {/* Water */}
        <mesh position={[0, 0.88, 0]} receiveShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 16]} />
          <meshPhysicalMaterial color="#7dd3fc" transmission={0.9} transparent />
        </mesh>
        {/* Small Bird */}
        <mesh position={[0.3, 1.05, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0.35, 1.1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Bird Beak */}
        <mesh position={[0.42, 1.09, 0]} rotation={[0, 0, -Math.PI/6]} castShadow>
          <coneGeometry args={[0.015, 0.04, 4]} />
          <meshStandardMaterial color="#ea580c" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("mailbox", "mailbox", "📫")) {
    return (
      <ModelWrapper>
        {/* Post */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1.0, 0.1]} />
          <meshStandardMaterial color="#451a03" />
        </mesh>
        {/* Box */}
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.5]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        {/* Flag */}
        <mesh position={[0.16, 1.2, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.2, 0.05]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("trash_can", "trash can", "🗑️")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.25, 1.0, 16]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.1, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("flower", "flower", "🌸")) {
    return (
      <ModelWrapper>
        {/* Stem */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
        {/* Center */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
        {/* Petals */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.15, 0.5, Math.sin(angle) * 0.15]} castShadow receiveShadow>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color="#f472b6" />
            </mesh>
          );
        })}
      </ModelWrapper>
    );
  }


  if (isMatch("grass_field", "grass field", "🌿")) {
    return (
      <ModelWrapper>
        {/* Scattered small grass blades */}
        {[
          [-0.3, 0, -0.3], [0.2, 0, -0.4], [-0.4, 0, 0.2], 
          [0.3, 0, 0.3], [0, 0, 0], [0.4, 0, -0.1], [-0.1, 0, 0.4]
        ].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]} rotation={[0, (i * Math.PI) / 3, 0]}>
            <mesh position={[-0.05, 0.05, 0]} rotation={[0, 0, 0.2]} castShadow>
              <coneGeometry args={[0.02, 0.1, 4]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
            <mesh position={[0.05, 0.075, 0]} rotation={[0, 0, -0.1]} castShadow>
              <coneGeometry args={[0.03, 0.15, 4]} />
              <meshStandardMaterial color="#16a34a" />
            </mesh>
            <mesh position={[0, 0.05, 0.05]} rotation={[0.2, 0, 0]} castShadow>
              <coneGeometry args={[0.02, 0.1, 4]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }


  if (isMatch("cat", "cat", "🐈")) {
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.6]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.55, 0.35]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.08, 0.75, 0.35]} castShadow receiveShadow>
          <coneGeometry args={[0.04, 0.15, 4]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0.08, 0.75, 0.35]} castShadow receiveShadow>
          <coneGeometry args={[0.04, 0.15, 4]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Tail (curved up) */}
        <group position={[0, 0.45, -0.35]} rotation={[-Math.PI / 6, 0, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.4]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
        {/* Legs */}
        {[
          [-0.1, 0.1, 0.2], [0.1, 0.1, 0.2],
          [-0.1, 0.1, -0.2], [0.1, 0.1, -0.2]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("horse", "horse", "🐎")) {
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.8, 1.6]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        {/* Neck */}
        <group position={[0, 1.7, 0.7]} rotation={[Math.PI / 6, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.6, 0.4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        </group>
        {/* Head */}
        <mesh position={[0, 2.1, 0.9]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.4, 0.6]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 2.0, 1.25]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.2, 0.3]} />
          <meshStandardMaterial color="#5C4033" />
        </mesh>
        {/* Mane */}
        <group position={[0, 1.8, 0.5]} rotation={[Math.PI / 6, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.7, 0.2]} />
            <meshStandardMaterial color="#3e2723" />
          </mesh>
        </group>
        {/* Tail */}
        <group position={[0, 1.0, -0.9]} rotation={[Math.PI / 8, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#3e2723" />
          </mesh>
        </group>
        {/* Ears */}
        <group position={[-0.1, 2.35, 0.75]} rotation={[0, 0, 0.2]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.05, 0.2, 4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        </group>
        <group position={[0.1, 2.35, 0.75]} rotation={[0, 0, -0.2]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.05, 0.2, 4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        </group>
        {/* Legs & Hooves */}
        {[
          [-0.3, 0.4, 0.6], [0.3, 0.4, 0.6],
          [-0.3, 0.4, -0.6], [0.3, 0.4, -0.6]
        ].map((pos, i) => (
          <group key={i} position={pos as [number,number,number]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.8, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.22, 0.1, 0.22]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("cow", "cow", "🐄")) {
    return (
      <ModelWrapper>
        {/* Body (White Base) */}
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.8, 1.6]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        {/* Black Spots on Body */}
        <mesh position={[0.51, 1.3, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.4, 0.5]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[-0.51, 1.1, -0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.5, 0.4]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 1.61, 0.4]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.02, 0.6]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        
        {/* Udder */}
        <mesh position={[0, 0.75, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.15, 0.4]} />
          <meshStandardMaterial color="#fbcfe8" />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.5, 0.9]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.5, 0.6]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 1.35, 1.25]} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.2, 0.15]} />
          <meshStandardMaterial color="#fbcfe8" />
        </mesh>

        {/* Horns */}
        <group position={[-0.2, 1.8, 0.9]} rotation={[0, 0, 0.2]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.05, 0.3, 4]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
        </group>
        <group position={[0.2, 1.8, 0.9]} rotation={[0, 0, -0.2]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.05, 0.3, 4]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
        </group>

        {/* Ears */}
        <group position={[-0.3, 1.6, 0.8]} rotation={[0, 0, 1.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
        <group position={[0.3, 1.6, 0.8]} rotation={[0, 0, -1.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
            <meshStandardMaterial color="#f3f4f6" />
          </mesh>
        </group>

        {/* Tail */}
        <group position={[0, 1.2, -0.85]} rotation={[0.2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.6]} />
            <meshStandardMaterial color="#f3f4f6" />
          </mesh>
        </group>
        {/* Tail Tuft */}
        <mesh position={[0, 0.85, -0.92]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.15, 0.08]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        {/* Legs & Hooves */}
        {[
          [-0.4, 0.4, 0.6], [0.4, 0.4, 0.6],
          [-0.4, 0.4, -0.6], [0.4, 0.4, -0.6]
        ].map((pos, i) => (
          <group key={i} position={pos as [number,number,number]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.8, 0.2]} />
              <meshStandardMaterial color="#f3f4f6" />
            </mesh>
            {/* Hoof */}
            <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.22, 0.1, 0.22]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("goat", "goat", "🐐")) {
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.6, 1.0]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.1, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.4]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 1.0, 0.75]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.15, 0.1]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
        {/* Beard */}
        <mesh position={[0, 0.85, 0.75]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.2, 0.05]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        {/* Horns (Curved back) */}
        <group position={[-0.1, 1.35, 0.4]} rotation={[-0.3, 0, 0.1]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.01, 0.03, 0.3]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        </group>
        <group position={[0.1, 1.35, 0.4]} rotation={[-0.3, 0, -0.1]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.01, 0.03, 0.3]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        </group>
        {/* Ears (Floppy) */}
        <group position={[-0.2, 1.15, 0.45]} rotation={[0, 0, 0.8]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        </group>
        <group position={[0.2, 1.15, 0.45]} rotation={[0, 0, -0.8]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        </group>
        {/* Tail (short) */}
        <group position={[0, 0.9, -0.55]} rotation={[0.4, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.15, 0.05]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        </group>
        {/* Legs & Hooves */}
        {[
          [-0.15, 0.25, 0.4], [0.15, 0.25, 0.4],
          [-0.15, 0.25, -0.4], [0.15, 0.25, -0.4]
        ].map((pos, i) => (
          <group key={i} position={pos as [number,number,number]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.5, 0.12]} />
              <meshStandardMaterial color="#d1d5db" />
            </mesh>
            <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.13, 0.1, 0.13]} />
              <meshStandardMaterial color="#4b5563" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("pig", "pig", "🐖")) {
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.6, 1.1]} />
          <meshStandardMaterial color="#fbcfe8" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.6, 0.65]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.5, 0.4]} />
          <meshStandardMaterial color="#fbcfe8" />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 0.5, 0.88]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.2, 0.1]} />
          <meshStandardMaterial color="#f9a8d4" />
        </mesh>
        {/* Ears */}
        <group position={[-0.2, 0.85, 0.6]} rotation={[0, 0, 0.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.15]} />
            <meshStandardMaterial color="#f9a8d4" />
          </mesh>
        </group>
        <group position={[0.2, 0.85, 0.6]} rotation={[0, 0, -0.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.15]} />
            <meshStandardMaterial color="#f9a8d4" />
          </mesh>
        </group>
        {/* Curly Tail */}
        <group position={[0, 0.6, -0.6]} rotation={[0, 0, 0]}>
          <mesh castShadow receiveShadow>
            <torusGeometry args={[0.06, 0.02, 8, 16, Math.PI * 1.5]} />
            <meshStandardMaterial color="#f9a8d4" />
          </mesh>
        </group>
        {/* Legs & Hooves */}
        {[
          [-0.2, 0.15, 0.4], [0.2, 0.15, 0.4],
          [-0.2, 0.15, -0.4], [0.2, 0.15, -0.4]
        ].map((pos, i) => (
          <group key={i} position={pos as [number,number,number]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.18, 0.3, 0.18]} />
              <meshStandardMaterial color="#fbcfe8" />
            </mesh>
            <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.19, 0.1, 0.19]} />
              <meshStandardMaterial color="#f472b6" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("dog", "dog", "🐕")) {
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 0.35, 0.7]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.65, 0.4]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 0.55, 0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.15, 0.2]} />
          <meshStandardMaterial color="#ca8a04" />
        </mesh>
        {/* Nose (Black tip) */}
        <mesh position={[0, 0.6, 0.72]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Collar */}
        <mesh position={[0, 0.45, 0.38]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.05, 0.2]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Ears (Floppy) */}
        <group position={[-0.18, 0.6, 0.3]} rotation={[0, 0, 0.3]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.25, 0.15]} />
            <meshStandardMaterial color="#854d0e" />
          </mesh>
        </group>
        <group position={[0.18, 0.6, 0.3]} rotation={[0, 0, -0.3]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.25, 0.15]} />
            <meshStandardMaterial color="#854d0e" />
          </mesh>
        </group>
        {/* Tail (Upward curve) */}
        <group position={[0, 0.55, -0.4]} rotation={[-0.5, 0, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.02, 0.03, 0.3]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
        </group>
        {/* Legs */}
        {[
          [-0.1, 0.15, 0.25], [0.1, 0.15, 0.25],
          [-0.1, 0.15, -0.25], [0.1, 0.15, -0.25]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#854d0e" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("chicken", "chicken", "🐓")) {
    return (
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.25, 0.35]} />
          <meshStandardMaterial color="#fef2f2" />
        </mesh>
        {/* Head/Neck */}
        <mesh position={[0, 0.5, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.25, 0.15]} />
          <meshStandardMaterial color="#fef2f2" />
        </mesh>
        {/* Comb (Red part on top of head) */}
        <mesh position={[0, 0.68, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 0.1, 0.12]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Beak */}
        <group position={[0, 0.55, 0.25]} rotation={[Math.PI/2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.04, 0.1, 4]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </group>
        {/* Wattle (Red part under beak) */}
        <mesh position={[0, 0.45, 0.22]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 0.08, 0.06]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Tail Feathers */}
        <group position={[0, 0.4, -0.2]} rotation={[-0.5, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.2, 0.15]} />
            <meshStandardMaterial color="#fef2f2" />
          </mesh>
        </group>
        {/* Wings */}
        <mesh position={[-0.14, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 0.15, 0.2]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        <mesh position={[0.14, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 0.15, 0.2]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        {/* Legs */}
        {[[-0.08, 0.1, 0], [0.08, 0.1, 0]].map((pos, i) => (
          <group key={i} position={pos as [number,number,number]}>
            {/* Leg */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 4]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            {/* Foot */}
            <mesh position={[0, -0.1, 0.05]} castShadow receiveShadow>
              <boxGeometry args={[0.06, 0.02, 0.1]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("stool", "stool")) {
    return (
      <ModelWrapper>
        {/* Seat */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
          <meshStandardMaterial color="#d97706" />
        </mesh>
        {/* Legs */}
        {[
          [-0.2, 0.3, 0.2], [0.2, 0.3, 0.2],
          [-0.2, 0.3, -0.2], [0.2, 0.3, -0.2]
        ].map((pos, i) => (
          <group key={i} position={pos as [number,number,number]} rotation={[pos[0] * 0.2, 0, pos[2] * -0.2]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.03, 0.02, 0.6, 8]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("sofa", "sofa", "🛋️")) {
    return (
      <ModelWrapper>
        {/* Base / Seat */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.3, 0.8]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.7, -0.3]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.6, 0.2]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        {/* Armrests */}
        <mesh position={[-0.9, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.4, 0.8]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
        <mesh position={[0.9, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.4, 0.8]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
        {/* Cushions */}
        <mesh position={[-0.4, 0.48, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.75, 0.1, 0.6]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
        <mesh position={[0.4, 0.48, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.75, 0.1, 0.6]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
        {/* Legs */}
        {[
          [-0.9, 0.1, 0.3], [0.9, 0.1, 0.3],
          [-0.9, 0.1, -0.3], [0.9, 0.1, -0.3]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.2, 0.1]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("bench", "bench", "")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.1, 0.8]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 0.8, -0.35]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.4, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {[[-0.9, 0.2, -0.3], [0.9, 0.2, -0.3], [-0.9, 0.2, 0.3], [0.9, 0.2, 0.3]].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("chair", "chair", "🪑")) {
    return (
      <ModelWrapper>
        {/* Seat */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.1, 0.6]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.9, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {/* Legs */}
        {[
          [-0.25, 0.25, 0.25], [0.25, 0.25, 0.25],
          [-0.25, 0.25, -0.25], [0.25, 0.25, -0.25]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <cylinderGeometry args={[0.03, 0.02, 0.5, 8]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("bookshelf", "bookshelf", "📚")) {
    return (
      <ModelWrapper>
        {/* Main Frame */}
        <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 2.5, 0.6]} />
          <meshStandardMaterial color="#5C4033" />
        </mesh>
        {/* Shelves (carved out by adding colored books) */}
        <mesh position={[0, 1.25, 0.31]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 2.3, 0.02]} />
          <meshStandardMaterial color="#3E2723" />
        </mesh>
        {/* Books / Contents */}
        {[0.4, 0.9, 1.4, 1.9].map((y, i) => (
          <group key={i} position={[0, y, 0.2]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.8, 0.05, 0.4]} />
              <meshStandardMaterial color="#8B5A2B" />
            </mesh>
            <mesh position={[-0.4, 0.2, 0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.35, 0.2]} />
              <meshStandardMaterial color={['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][i]} />
            </mesh>
            <mesh position={[0.5, 0.15, 0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.6, 0.25, 0.2]} />
              <meshStandardMaterial color={['#f59e0b', '#ef4444', '#3b82f6', '#10b981'][i]} />
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("wardrobe", "wardrobe", "🚪")) {
    return (
      <ModelWrapper>
        {/* Frame */}
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 2.8, 1.0]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {/* Left Door */}
        <mesh position={[-0.5, 1.4, 0.52]} castShadow receiveShadow>
          <boxGeometry args={[0.96, 2.7, 0.05]} />
          <meshStandardMaterial color="#A0522D" />
        </mesh>
        {/* Right Door */}
        <mesh position={[0.5, 1.4, 0.52]} castShadow receiveShadow>
          <boxGeometry args={[0.96, 2.7, 0.05]} />
          <meshStandardMaterial color="#A0522D" />
        </mesh>
        {/* Handles */}
        <mesh position={[-0.1, 1.4, 0.56]} castShadow receiveShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
        <mesh position={[0.1, 1.4, 0.56]} castShadow receiveShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("table", "table", "🪑")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.1, 2.0]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {[[-0.9, 0.45, -0.9], [0.9, 0.45, -0.9], [-0.9, 0.45, 0.9], [0.9, 0.45, 0.9]].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.9, 0.1]} />
            <meshStandardMaterial color="#8B5A2B" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("door", "door", "🚪")) {
    return <InteractiveDoor data={data} handleClick={handleClick} isExploreMode={isExploreMode} />;
  }

  if (isMatch("window", "window", "🪟")) {
    return (
      <ModelWrapper>
        {/* Frame Outer */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.8, 0.1]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
        {/* Glass Center */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.7, 0.12]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.6} />
        </mesh>
        {/* Crossbar Vertical */}
        <mesh position={[0, 0.4, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.8, 0.15]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
        {/* Crossbar Horizontal */}
        <mesh position={[0, 0.4, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 0.15]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("bed", "bed", "🛏️")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.2, 1.9]} />
          <meshStandardMaterial color="#eff6ff" />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.3, 2.0]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 0.6, -0.95]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 0.45, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.1, 0.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("bush", "bush", "🌿")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("rock", "rock", "🪨")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("tree", "pine", "oak", "palm", "🌲", "🌳", "🌴")) {
    const isBig = isMatch("big");
    const isSmall = isMatch("small");
    const isOak = isMatch("oak", "🌳");
    const isPalm = isMatch("palm", "🌴");
    
    // Pine tree (default)
    if (!isOak && !isPalm) {
      const scale = isBig ? 1.5 : isSmall ? 0.8 : 1.0;
      return (
        <ModelWrapper>
          <group scale={[scale, scale, scale]}>
            {/* Trunk */}
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
              <meshStandardMaterial color="#5C4033" />
            </mesh>
            {/* Leaves */}
            <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
              <coneGeometry args={[0.8, 1.5, 8]} />
              <meshStandardMaterial color="#2d6a4f" />
            </mesh>
            {isBig && (
              <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
                <coneGeometry args={[0.6, 1.2, 8]} />
                <meshStandardMaterial color="#2d6a4f" />
              </mesh>
            )}
          </group>
        </ModelWrapper>
      );
    }
    
    // Oak Tree
    if (isOak) {
      const scale = isBig ? 1.5 : isSmall ? 0.7 : 1.0;
      return (
        <ModelWrapper>
          <group scale={[scale, scale, scale]}>
            <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.25, 0.3, 1.2, 8]} />
              <meshStandardMaterial color="#4A3728" />
            </mesh>
            <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
              <sphereGeometry args={[1.0, 16, 16]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
          </group>
        </ModelWrapper>
      );
    }

    // Palm Tree
    if (isPalm) {
      return (
        <ModelWrapper>
          <group scale={[1.2, 1.2, 1.2]}>
             <mesh position={[0, 1.2, 0]} rotation={[0, 0, 0.1]} castShadow receiveShadow>
               <cylinderGeometry args={[0.15, 0.2, 2.5, 8]} />
               <meshStandardMaterial color="#c29d59" />
             </mesh>
             {/* Palm leaves */}
             {[0, 1.57, 3.14, 4.71].map((rot, i) => (
                <mesh key={i} position={[Math.sin(rot)*0.5, 2.5, Math.cos(rot)*0.5]} rotation={[0.4, rot, 0]} castShadow receiveShadow>
                  <sphereGeometry args={[0.6, 8, 8]} />
                  <meshStandardMaterial color="#10b981" />
                </mesh>
             ))}
          </group>
        </ModelWrapper>
      )
    }
  }

  

  if (isMatch("car", "car", "🚗")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Body */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.4, 0.8]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Cabin */}
        <mesh position={[-0.1, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.4, 0.7]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
        </mesh>
        {/* Wheels */}
        {[[-0.5, 0.2, 0.4], [0.5, 0.2, 0.4], [-0.5, 0.2, -0.4], [0.5, 0.2, -0.4]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("lemborgini", "lemborgini", "🏎️")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Chassis / Lower Body */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.2, 1.4]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>
        
        {/* Front slope (Hood) */}
        <mesh position={[-0.8, 0.4, 0]} rotation={[0, 0, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.2, 1.3]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>

        {/* Back Engine Area */}
        <mesh position={[0.8, 0.4, 0]} rotation={[0, 0, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.25, 1.3]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>

        {/* Cabin Roof */}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.25, 1.0]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        
        {/* Windshield */}
        <mesh position={[-0.6, 0.6, 0]} rotation={[0, 0, 0.4]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.25, 1.0]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Rear Window */}
        <mesh position={[0.6, 0.6, 0]} rotation={[0, 0, -0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.25, 1.0]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Spoiler */}
        <mesh position={[1.3, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.05, 1.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Spoiler supports */}
        <mesh position={[1.2, 0.6, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.2, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[1.2, 0.6, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.2, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Side Skirts */}
        <mesh position={[0, 0.2, 0.71]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.1, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 0.2, -0.71]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.1, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Wheels */}
        {[[-0.9, 0.2, 0.65], [0.9, 0.2, 0.65], [-0.9, 0.2, -0.65], [0.9, 0.2, -0.65]].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (pos[2] > 0 ? 0.11 : -0.11)]} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
          </group>
        ))}

        {/* Headlights */}
        <mesh position={[-1.35, 0.35, 0.4]} rotation={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[0.1, 0.05, 0.3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-1.35, 0.35, -0.4]} rotation={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[0.1, 0.05, 0.3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>

        {/* Taillights */}
        <mesh position={[1.4, 0.45, 0.4]} rotation={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>
        <mesh position={[1.4, 0.45, -0.4]} rotation={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("defender", "defender", "🚙")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Chassis / Lower Body */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.6, 1.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        
        {/* Front Hood */}
        <mesh position={[-0.8, 0.85, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.1, 1.35]} />
          <meshStandardMaterial color="#475569" />
        </mesh>

        {/* Cabin */}
        <mesh position={[0.3, 1.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.6, 1.35]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        
        {/* Windows / Glass */}
        {/* Windshield */}
        <mesh position={[-0.51, 1.0, 0]} rotation={[0, 0, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.55, 1.25]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Side Windows */}
        <mesh position={[0.3, 0.95, 0.68]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.45, 0.05]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.3, 0.95, -0.68]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.45, 0.05]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Rear Window */}
        <mesh position={[1.11, 1.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.5, 1.2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Roof */}
        <mesh position={[0.3, 1.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.05, 1.35]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        
        {/* Roof Rails */}
        <mesh position={[0.3, 1.36, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.05, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.3, 1.36, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.05, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Wheel Arches (Fenders) */}
        {/* Front Left */}
        <mesh position={[-0.8, 0.45, 0.72]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Front Right */}
        <mesh position={[-0.8, 0.45, -0.72]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Rear Left */}
        <mesh position={[0.8, 0.45, 0.72]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Rear Right */}
        <mesh position={[0.8, 0.45, -0.72]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Wheels */}
        {[[-0.8, 0.25, 0.7], [0.8, 0.25, 0.7], [-0.8, 0.25, -0.7], [0.8, 0.25, -0.7]].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (pos[2] > 0 ? 0.13 : -0.13)]} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        ))}

        {/* Spare Tire on Rear Tailgate */}
        <group position={[1.45, 0.7, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0.11, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>

        {/* Front Grill */}
        <mesh position={[-1.31, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.2, 1.2]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Headlights (Round in Square housing) */}
        <mesh position={[-1.32, 0.65, 0.45]} castShadow>
          <boxGeometry args={[0.05, 0.2, 0.2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-1.35, 0.65, 0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-1.32, 0.65, -0.45]} castShadow>
          <boxGeometry args={[0.05, 0.2, 0.2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-1.35, 0.65, -0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>

        {/* Taillights */}
        <mesh position={[1.31, 0.65, 0.55]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.1]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>
        <mesh position={[1.31, 0.65, -0.55]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.1]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>

        {/* Front Bumper */}
        <mesh position={[-1.35, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.15, 1.4]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[1.35, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.15, 1.4]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("truck", "truck", "🛻")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Chassis / Lower Body Frame */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.3, 1.2]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        
        {/* Cabin */}
        <mesh position={[-1.0, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 1.3, 1.3]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>

        {/* Cabin Roof Trim */}
        <mesh position={[-1.0, 1.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.1, 1.35]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        
        {/* Windshield */}
        <mesh position={[-1.51, 1.3, 0]} rotation={[0, 0, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.6, 1.1]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Side Windows */}
        <mesh position={[-1.0, 1.3, 0.66]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.5, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-1.0, 1.3, -0.66]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.5, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Front Grill */}
        <mesh position={[-1.52, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.5, 1.0]} />
          <meshStandardMaterial color="#111827" />
        </mesh>

        {/* Front Bumper */}
        <mesh position={[-1.55, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.2, 1.4]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        
        {/* Headlights */}
        <mesh position={[-1.66, 0.4, 0.5]} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-1.66, 0.4, -0.5]} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>

        {/* Dump Bed */}
        <group position={[0.5, 1.25, 0]}>
          <mesh position={[0, -0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.2, 1.4]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[-0.9, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 1.2, 1.4]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0.9, 0, 0]} rotation={[0, 0, -0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 1.2, 1.4]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0, 0, 0.65]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 1.2, 0.1]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0, 0, -0.65]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 1.2, 0.1]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <mesh position={[0, 0, 0.71]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 1.1, 0.05]} />
                <meshStandardMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0, 0, -0.71]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 1.1, 0.05]} />
                <meshStandardMaterial color="#fbbf24" />
              </mesh>
            </group>
          ))}
          {/* Cab Guard */}
          <mesh position={[-1.4, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.1, 1.4]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </group>

        {/* Wheels (4 Axles = 8 Wheels) */}
        {[
          [-1.0, 0.25, 0.65], [-1.0, 0.25, -0.65],
          [0.1, 0.25, 0.65], [0.1, 0.25, -0.65],
          [0.8, 0.25, 0.65], [0.8, 0.25, -0.65],
          [1.5, 0.25, 0.65], [1.5, 0.25, -0.65]
        ].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (pos[2] > 0 ? 0.16 : -0.16)]} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          </group>
        ))}

        {/* Side Tanks/Steps */}
        <mesh position={[-0.4, 0.3, 0.61]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.2, 0.15]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[-0.4, 0.3, -0.61]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.2, 0.15]} />
          <meshStandardMaterial color="#475569" />
        </mesh>

        {/* Exhaust pipe */}
        <mesh position={[-0.4, 1.2, 0.7]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>

      </ModelWrapper>
    );
  }

  if (isMatch("bike", "bike", "🏍️")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Main Body (Fairing and Gas Tank) */}
        {/* Lower Fairing */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.4, 0.5]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        
        {/* Gas Tank */}
        <mesh position={[0.2, 0.7, 0]} rotation={[0, 0, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.3, 0.45]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        
        {/* Front Cowl / Nose */}
        <mesh position={[-0.7, 0.65, 0]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.4, 0.48]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        
        {/* Tail Section */}
        <mesh position={[0.8, 0.65, 0]} rotation={[0, 0, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.25, 0.35]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>

        {/* Seat */}
        <mesh position={[0.5, 0.75, 0]} rotation={[0, 0, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.1, 0.3]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Windshield */}
        <mesh position={[-0.8, 0.9, 0]} rotation={[0, 0, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.2, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.6} />
        </mesh>

        {/* Engine Area (Exposed parts) */}
        <mesh position={[0.1, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.3, 0.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>

        {/* Exhaust Pipe (Right Side) */}
        <mesh position={[0.6, 0.25, 0.3]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.05, 0.8, 16]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        {/* Exhaust Pipe (Left Side) */}
        <mesh position={[0.6, 0.25, -0.3]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.05, 0.8, 16]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Front Fork / Suspension */}
        <mesh position={[-0.9, 0.4, 0.1]} rotation={[0, 0, 0.3]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[-0.9, 0.4, -0.1]} rotation={[0, 0, 0.3]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        
        {/* Rear Swingarm */}
        <mesh position={[0.5, 0.25, 0.15]} rotation={[0, 0, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.5, 0.25, -0.15]} rotation={[0, 0, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>

        {/* Wheels */}
        {/* Front Wheel */}
        <group position={[-1.0, 0.25, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.15, 24]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.08]} castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.08]} castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>

        {/* Rear Wheel */}
        <group position={[0.9, 0.25, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.2, 24]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.11]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.11]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>

        {/* Headlight */}
        <mesh position={[-0.96, 0.65, 0]} rotation={[0, 0, 0.2]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>

        {/* Taillight */}
        <mesh position={[1.11, 0.68, 0]} rotation={[0, 0, -0.15]} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.15]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>

        {/* Handlebars */}
        <group position={[-0.5, 0.85, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
            <meshStandardMaterial color="#171717" />
          </mesh>
        </group>

      </ModelWrapper>
    );
  }

  if (isMatch("bus", "bus", "🚌")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Main Body */}
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.8, 1.4, 1.4]} />
          <meshStandardMaterial color="#ffffff" /> {/* White body */}
        </mesh>
        
        {/* Lower Front / Bumper area */}
        <mesh position={[-2.42, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.5, 1.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Front Grill / Black detailing */}
        <mesh position={[-2.43, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.2, 1.0]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Headlights */}
        <mesh position={[-2.43, 0.5, 0.55]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.25]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-2.43, 0.5, -0.55]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.25]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>

        {/* Front Windshield */}
        <mesh position={[-2.41, 1.1, 0]} rotation={[0, 0, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.8, 1.35]} />
          <meshStandardMaterial color="#0f172a" /> {/* Very dark glass */}
        </mesh>

        {/* Side Windows */}
        <mesh position={[0, 1.1, 0.71]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.7, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 1.1, -0.71]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.7, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Rear Window */}
        <mesh position={[2.41, 1.1, 0]} rotation={[0, 0, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.7, 1.35]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Taillights */}
        <mesh position={[2.41, 0.6, 0.55]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.15]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>
        <mesh position={[2.41, 0.6, -0.55]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.15]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>

        {/* Rear Bumper/Engine Door area */}
        <mesh position={[2.42, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.5, 1.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Roof AC Unit */}
        <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.15, 0.8]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>

        {/* Side Mirrors (Antenna style pointing down) */}
        <group position={[-2.3, 1.4, 0.75]}>
          <mesh rotation={[0, 0, -0.5]} position={[0.1, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#171717" />
          </mesh>
          <mesh position={[0.2, -0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.3, 0.15]} />
            <meshStandardMaterial color="#171717" />
          </mesh>
        </group>
        <group position={[-2.3, 1.4, -0.75]}>
          <mesh rotation={[0, 0, -0.5]} position={[0.1, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#171717" />
          </mesh>
          <mesh position={[0.2, -0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.3, 0.15]} />
            <meshStandardMaterial color="#171717" />
          </mesh>
        </group>

        {/* Wheels (2 Axles) */}
        {[
          [-1.6, 0.25, 0.7], [-1.6, 0.25, -0.7], // Front axle
          [1.6, 0.25, 0.7], [1.6, 0.25, -0.7]    // Rear axle
        ].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.4, 0.4, 0.2, 24]} />
              <meshStandardMaterial color="#111827" /> {/* Tires */}
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (pos[2] > 0 ? 0.11 : -0.11)]} castShadow receiveShadow>
              <cylinderGeometry args={[0.25, 0.25, 0.02, 16]} />
              <meshStandardMaterial color="#cbd5e1" /> {/* Silver Hubcaps */}
            </mesh>
          </group>
        ))}

        {/* Wheel Arches (Dark cuts in the white body) */}
        <mesh position={[-1.6, 0.3, 0.71]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 0.05]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[-1.6, 0.3, -0.71]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 0.05]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[1.6, 0.3, 0.71]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 0.05]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[1.6, 0.3, -0.71]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 0.05]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Side Doors (Subtle lines) */}
        <mesh position={[-1.0, 0.7, 0.71]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 1.3, 0.02]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>

      </ModelWrapper>
    );
  }

  if (isMatch("jeep", "jeep", "🛻")) {
    return wrapIfVehicle(
      <ModelWrapper>
        {/* Main Body Lower */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#9333ea" /> {/* Purple */}
        </mesh>
        
        {/* Hood */}
        <mesh position={[-0.8, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.2, 1.2]} />
          <meshStandardMaterial color="#9333ea" />
        </mesh>

        {/* Front Grill Area */}
        <mesh position={[-1.21, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.4, 1.2]} />
          <meshStandardMaterial color="#9333ea" />
        </mesh>
        
        {/* Grill Slots (7 vertical slots) */}
        {[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map((zPos, idx) => (
          <mesh key={idx} position={[-1.22, 0.65, zPos]} castShadow>
            <boxGeometry args={[0.05, 0.25, 0.05]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        ))}

        {/* Headlights */}
        <mesh position={[-1.25, 0.65, 0.35]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-1.25, 0.65, -0.35]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>

        {/* Front Bumper */}
        <mesh position={[-1.3, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.15, 1.4]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Rear Bumper */}
        <mesh position={[1.25, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.15, 1.3]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Front Fenders / Wheel Arches */}
        <mesh position={[-0.8, 0.7, 0.65]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 0.2]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[-0.8, 0.7, -0.65]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 0.2]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Rear Fenders / Wheel Arches */}
        <mesh position={[0.8, 0.7, 0.65]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 0.2]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[0.8, 0.7, -0.65]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 0.2]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Windshield Frame */}
        <mesh position={[-0.3, 1.05, 0]} rotation={[0, 0, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.5, 1.2]} />
          <meshStandardMaterial color="#9333ea" />
        </mesh>
        {/* Windshield Glass */}
        <mesh position={[-0.3, 1.05, 0]} rotation={[0, 0, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.45, 1.1]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={0.7} />
        </mesh>

        {/* Roll Cage */}
        {/* Top Side Rails */}
        <mesh position={[-0.2, 1.35, 0.55]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.6, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[-0.2, 1.35, -0.55]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.6, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        {/* Rear Vertical Posts */}
        <mesh position={[1.1, 1.05, 0.55]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[1.1, 1.05, -0.55]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        {/* Middle Vertical Posts */}
        <mesh position={[0.2, 1.05, 0.55]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[0.2, 1.05, -0.55]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        {/* Top Crossbars */}
        <mesh position={[1.1, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        <mesh position={[-1.4, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
          <meshStandardMaterial color="#171717" />
        </mesh>

        {/* Seats */}
        {/* Driver Seat */}
        <mesh position={[-0.1, 0.75, 0.25]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.1, 0.4]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.1, 1.0, 0.25]} rotation={[0, 0, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.5, 0.4]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        {/* Passenger Seat */}
        <mesh position={[-0.1, 0.75, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.1, 0.4]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.1, 1.0, -0.25]} rotation={[0, 0, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.5, 0.4]} />
          <meshStandardMaterial color="#111827" />
        </mesh>

        {/* Spare Tire */}
        <group position={[1.3, 0.85, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.15, 24]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0.08, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        </group>

        {/* Wheels */}
        {[
          [-0.8, 0.3, 0.65], [-0.8, 0.3, -0.65],
          [0.8, 0.3, 0.65], [0.8, 0.3, -0.65]
        ].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.2, 24]} />
              <meshStandardMaterial color="#111827" /> {/* Tires */}
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (pos[2] > 0 ? 0.11 : -0.11)]} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
              <meshStandardMaterial color="#cbd5e1" /> {/* Hubcaps */}
            </mesh>
          </group>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("lamp", "lamp", "🏮")) {
    return (
      <ModelWrapper>
        {/* Post */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.1, 2, 8]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
        {/* Light */}
        <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
        </mesh>
        {/* Cap */}
        <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.05, 8]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("fence", "fence", "🏗️")) {
    return (
      <ModelWrapper>
        {/* Posts */}
        <mesh position={[-0.6, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0.6, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {/* Rails */}
        <mesh position={[0, 0.6, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.1, 0.05]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 0.3, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.1, 0.05]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
      </ModelWrapper>
    );
  }

  if (isMatch("fence-side", "fence side", "🚧")) {
    return (
      <ModelWrapper>
        {/* Posts */}
        <mesh position={[0, 0.4, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 0.4, 0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {/* Rails */}
        <mesh position={[0.06, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.1, 1.4]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0.06, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.1, 1.4]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
      </ModelWrapper>
    );
  }

  // Fallback for custom teacher items: box with emoji
  const boxColor = "#9ca3af";

  return (
    <group position={[data.x, yPos, data.z]} rotation={[0, data.rotationY || 0, 0]} onClick={handleClick}>
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
  const [activeMaterialType, setActiveMaterialType] = useState<'color' | 'texture' | 'glass'>('color');
  const [activeTexture, setActiveTexture] = useState<string>('wood');
  const [objectsState, setObjectsState] = useState<PlacedObject[]>([]);
  const objectsRef = useRef<PlacedObject[]>([]);
  const objects = objectsState;
  const setObjects = useCallback((objs: PlacedObject[]) => {
    setObjectsState(objs);
    objectsRef.current = objs;
  }, []);
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'error'|'success'} | null>(null);
  const [undosRemaining, setUndosRemaining] = useState(3);
  const [sessionPlaced, setSessionPlaced] = useState<PlacedObject[]>([]);
  const isSavingRef = useRef(false);
  const pointerDownPos = useRef<{x: number; y: number} | null>(null);

  // Stable ref-based isDragging check used by 3D components
  const draggedRef = useRef(false);
  const isDraggingFn = useCallback(() => draggedRef.current, []);
  const [isRotating, setIsRotating] = useState(false);

  const [toolMode, setToolMode] = useState<ToolMode>('build');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [newColorInput, setNewColorInput] = useState<string>("#ffffff");
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [selectedRoofCorners, setSelectedRoofCorners] = useState<PlacedObject[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  const [showVehiclesDropdown, setShowVehiclesDropdown] = useState(false);
  const [showAnimalsDropdown, setShowAnimalsDropdown] = useState(false);
  const [showTreesDropdown, setShowTreesDropdown] = useState(false);
  const [showFurnituresDropdown, setShowFurnituresDropdown] = useState(false);
  const [showLandscapeDropdown, setShowLandscapeDropdown] = useState(false);
  const [showItemsMenu, setShowItemsMenu] = useState(true);
  const [showAvatars, setShowAvatars] = useState(false);
  const [showLandUpgrade, setShowLandUpgrade] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [activeWidth, setActiveWidth] = useState<number>(1);
  const [activeThickness, setActiveThickness] = useState<number>(1);
  const [activeDepth, setActiveDepth] = useState<number>(1);
  const [activeCurveness, setActiveCurveness] = useState<number>(0);
  const [activeRotation, setActiveRotation] = useState<number>(0);
  const [activeShape, setActiveShape] = useState<'box' | 'wedge' | 'pyramid'>('box');
  const [isEditingBlocks, setIsEditingBlocks] = useState(false);
  const isEditingRef = useRef(false);
  useEffect(() => { isEditingRef.current = isEditingBlocks; }, [isEditingBlocks]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [drivingVehicle, setDrivingVehicle] = useState<PlacedObject | null>(null);
  const drivingVehicleRef = useRef<PlacedObject | null>(null);
  useEffect(() => { drivingVehicleRef.current = drivingVehicle; }, [drivingVehicle]);
  const [prefabSelectionIds, setPrefabSelectionIds] = useState<string[]>([]);
  const [showPrefabsDropdown, setShowPrefabsDropdown] = useState(false);
  const [isGizmoDragging, setIsGizmoDragging] = useState(false);
  const [activePrefabId, setActivePrefabId] = useState<string | null>(null);
  
  const getBlockId = (obj: PlacedObject) => `${obj.x},${obj.y},${obj.z}`;

  const updateSelectedBlocks = (updates: Partial<PlacedObject>) => {
    if (selectedBlockIds.length === 0) return null;
    
    const hasHeightUpdate = updates.thickness !== undefined || updates.h !== undefined;
    let newObjects = [...objects];
    
    const selectedIndices = newObjects
      .map((o, idx) => selectedBlockIds.includes(getBlockId(o)) ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (hasHeightUpdate) {
      for (const i of selectedIndices) {
        const o = newObjects[i];
        const oldHeight = (o.type === 'large-roof' ? o.h : o.thickness) || 1;
        const newHeight = (o.type === 'large-roof' ? updates.h : updates.thickness) ?? oldHeight;
        const delta = newHeight - oldHeight;
        
        if (delta !== 0) {
          const oW = o.w || 1;
          const oD = o.d || 1;
          const minX = o.x - (oW - 1) / 2;
          const maxX = o.x + (oW - 1) / 2;
          const minZ = o.z - (oD - 1) / 2;
          const maxZ = o.z + (oD - 1) / 2;

          for (let j = 0; j < newObjects.length; j++) {
            const above = newObjects[j];
            if (above.x >= minX && above.x <= maxX && above.z >= minZ && above.z <= maxZ && above.y > o.y) {
              newObjects[j] = { ...above, y: Number((above.y + delta).toFixed(2)) };
            }
          }
        }
        newObjects[i] = { ...newObjects[i], ...updates };
      }
    } else {
      for (const i of selectedIndices) {
        newObjects[i] = { ...newObjects[i], ...updates };
      }
    }

    setObjects(newObjects);
    objectsRef.current = newObjects;
    return newObjects;
  };

  const handleWidthChange = (val: number) => {
    setActiveWidth(val);
    if (isEditingBlocks) updateSelectedBlocks({ width: val });
  };

  const handleThicknessChange = (val: number) => {
    setActiveThickness(val);
    if (isEditingBlocks) updateSelectedBlocks({ thickness: val, h: val });
  };

  const handleDepthChange = (val: number) => {
    setActiveDepth(val);
    if (isEditingBlocks) updateSelectedBlocks({ depth: val });
  };

  const handleCurvenessChange = (val: number) => {
    setActiveCurveness(val);
    if (isEditingBlocks) updateSelectedBlocks({ curveness: val });
  };

  const handleShapeChange = (shape: 'box' | 'wedge' | 'pyramid') => {
    setActiveShape(shape);
    if (isEditingBlocks) updateSelectedBlocks({ blockShape: shape });
  };

  const handleRotationChange = (val: number) => {
    setActiveRotation(val);
    if (isEditingBlocks) updateSelectedBlocks({ rotationY: (val * Math.PI) / 180 });
  };

  const dragStartRotations = useRef<{index: number, rot: THREE.Quaternion, pos: THREE.Vector3, h: number}[]>([]);
  const dragCenter = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragStartMouse = useRef<{x: number, y: number}>({x: 0, y: 0});

  const handleHighlightPointerDown = (e: any, data: PlacedObject) => {
    if (toolMode !== 'build' && toolMode !== 'roof') return;
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setIsRotating(true);
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    
    const selectedIndices = objectsRef.current
      .map((o, idx) => selectedBlockIds.includes(getBlockId(o)) ? idx : -1)
      .filter(idx => idx !== -1);

    dragStartRotations.current = selectedIndices.map(i => {
      const o = objectsRef.current[i];
      const euler = new THREE.Euler(o.rotationX || 0, o.rotationY || 0, o.rotationZ || 0, 'XYZ');
      const thickness = o.thickness || 1;
      const h = o.type === 'large-roof' ? (o.h || 1) : thickness;
      const posY = o.y - 0.5 + h / 2;
      return {
        index: i,
        rot: new THREE.Quaternion().setFromEuler(euler),
        pos: new THREE.Vector3(o.x, posY, o.z),
        h: h
      };
    });
    
    const center = new THREE.Vector3();
    dragStartRotations.current.forEach(b => center.add(b.pos));
    if (dragStartRotations.current.length > 0) {
      center.divideScalar(dragStartRotations.current.length);
    }
    dragCenter.current = center;
  };

  const handleHighlightPointerMove = (e: any) => {
    if (!isRotating) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartMouse.current.x;
    const dy = e.clientY - dragStartMouse.current.y;
    
    const angleX = dy * 0.01;
    const angleY = dx * 0.01;
    const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(angleX, angleY, 0, 'YXZ'));
    
    let newObjects = [...objectsRef.current];
    let changed = false;
    const newSelectedIds: string[] = [];
    
    for (const state of dragStartRotations.current) {
      const o = newObjects[state.index];
      const relativePos = state.pos.clone().sub(dragCenter.current);
      relativePos.applyQuaternion(deltaQ);
      const newPos = dragCenter.current.clone().add(relativePos);
      
      const newRot = state.rot.clone().premultiply(deltaQ);
      const euler = new THREE.Euler().setFromQuaternion(newRot, 'XYZ');
      
      const newDataY = newPos.y + 0.5 - state.h / 2;
      
      newObjects[state.index] = {
        ...o,
        x: Number(newPos.x.toFixed(2)),
        y: Number(newDataY.toFixed(2)),
        z: Number(newPos.z.toFixed(2)),
        rotationX: Number(euler.x.toFixed(2)),
        rotationY: Number(euler.y.toFixed(2)),
        rotationZ: Number(euler.z.toFixed(2))
      };
      changed = true;
      newSelectedIds.push(getBlockId(newObjects[state.index]));
    }
    
    if (changed) {
      setObjects(newObjects);
      objectsRef.current = newObjects;
      setSelectedBlockIds(newSelectedIds);
    }
  };

  const handleHighlightPointerUp = (e: any) => {
    if (!isRotating) return;
    e.stopPropagation();
    if (e.target && e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId);
    }
    setIsRotating(false);
    handleEditSave();
  };

  const handleSavePrefab = async () => {
    if (prefabSelectionIds.length === 0) return;
    
    // Get selected objects
    const selectedObjects = objects.filter(o => prefabSelectionIds.includes(getBlockId(o)));
    if (selectedObjects.length === 0) return;
    
    // Find min Y to use as anchor, and center X/Z
    const minY = Math.min(...selectedObjects.map(o => o.y));
    const minX = Math.min(...selectedObjects.map(o => o.x));
    const maxX = Math.max(...selectedObjects.map(o => o.x));
    const minZ = Math.min(...selectedObjects.map(o => o.z));
    const maxZ = Math.max(...selectedObjects.map(o => o.z));
    
    const cx = Math.round((minX + maxX) / 2);
    const cz = Math.round((minZ + maxZ) / 2);
    
    // Create new prefab
    const newPrefab: Prefab = {
      id: `prefab_${Date.now()}`,
      name: `Prefab ${settings?.prefabs?.length ? settings.prefabs.length + 1 : 1}`,
      emoji: "📦",
      objects: selectedObjects.map(o => ({
        ...o,
        x: o.x - cx,
        y: o.y - minY,
        z: o.z - cz
      }))
    };
    
    const updatedSettings = {
      ...settings,
      prefabs: [...(settings?.prefabs || []), newPrefab]
    };
    
    setSettings(updatedSettings);
    setPrefabSelectionIds([]);
    setToolMode('prefab');
    setActivePrefabId(newPrefab.id);
    setShowItemsMenu(true);
    
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefabs: updatedSettings.prefabs })
      });
      setActionMessage({text: `Prefab Saved!`, type: 'success'});
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setActionMessage({text: `Error saving prefab`, type: 'error'});
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleEditSave = () => {
    if (isEditingBlocks && selectedBlockIds.length > 0) {
      saveObjects(objectsRef.current, studentData.pointsBalance, "Edited block properties", 0);
    }
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    if (isEditingBlocks) {
      const newObjects = updateSelectedBlocks({ color });
      if (newObjects) saveObjects(newObjects, studentData.pointsBalance, "Edited block color", 0);
    }
  };

  /* ─── Keyboard Listeners ─── */
  usePlayerKeyboardControls();

  useEffect(() => {
    if (studentData?.isClassTime) {
      setIsExploreMode(true);
    }
  }, [studentData?.isClassTime]);

  /* ─── Data Fetching ─── */

  const fetchData = async () => {
    if (!user) return;
    try {
      const [studentRes, settingsRes] = await Promise.all([fetch("/api/students"), fetch("/api/settings")]);
      const students = await studentRes.json();
      const currentStudent = students.find((s: any) => s._id === user.id);
      const config = await settingsRes.json();
      setSettings(config);
      if (currentStudent && !isSavingRef.current && !isEditingRef.current && !drivingVehicleRef.current) {
        setStudentData(currentStudent);
        setObjects(currentStudent.worldBlocks || []);
        if (!activeColor) {
          setActiveColor(BASE_COLORS[0].color);
        }
      }
    } catch (e) {} finally { if (!isSavingRef.current) setLoading(false); }
  };


  const handleEnterVehicle = (obj: PlacedObject) => {
    setDrivingVehicle(obj);
  };

  const handleExitVehicle = () => {
    if (!drivingVehicle) return;
    const newPos = playerState.pos;
    const newRot = playerState.rotation + Math.PI / 2;
    
    // Use original ID to match since objects array might have been recreated by interval fetch
    const origId = getBlockId(drivingVehicle);
    let found = false;
    const updatedObjects = objectsRef.current.map(o => {
      if (!found && getBlockId(o) === origId && o.itemId === drivingVehicle.itemId) {
        found = true;
        return { ...o, x: newPos.x, y: newPos.y, z: newPos.z, rotationY: newRot };
      }
      return o;
    });

    if (!found) {
      updatedObjects.push({ ...drivingVehicle, x: newPos.x, y: newPos.y, z: newPos.z, rotationY: newRot });
    }

    setObjects(updatedObjects);
    saveObjects(updatedObjects, studentData?.pointsBalance || 0, "Exited vehicle", 0);
    setDrivingVehicle(null);
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, [user]);

  const showMessage = (text: string, type: 'error'|'success') => {
    setActionMessage({ text, type }); setTimeout(() => setActionMessage(null), 3000);
  };

  const blockCost = settings?.builderBlockCost ?? 50;
  const blockRefund = settings?.builderBlockRefund ?? 0;
  const shopItems: any[] = settings?.builderItems ?? [];

  const isCustomColor = studentData?.customColors?.includes(activeColor);
  const actualBlockCost = isCustomColor ? 0 : blockCost;
  const actualRoofCost = isCustomColor ? 0 : (settings?.builderRoofCost ?? 100);

  const handleAvatarPurchase = async (avatarId: string, cost: number) => {
    if (!studentData) return;
    if (studentData.pointsBalance < cost) {
      showMessage("Not enough points!", "error");
      return;
    }
    const newUnlocked = [...(studentData.unlockedAvatars || ['boy']), avatarId];
    const newBalance = studentData.pointsBalance - cost;
    
    setStudentData({ ...studentData, pointsBalance: newBalance, unlockedAvatars: newUnlocked, activeAvatar: avatarId });
    
    try {
      const res = await fetch("/api/students", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, pointsBalance: newBalance, unlockedAvatars: newUnlocked, activeAvatar: avatarId })
      });
      if (!res.ok) throw new Error("Save failed");
      
      if (cost > 0) {
        await fetch("/api/withdrawals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: user?.id, pointsDeducted: cost, rewardDescription: `Bought Avatar: ${avatarId}` })
        });
      }
      showMessage("Avatar purchased!", "success");
    } catch (e) {
      showMessage("Failed to buy avatar", "error");
    }
  };

  const handleAvatarEquip = async (avatarId: string) => {
    if (!studentData) return;
    setStudentData({ ...studentData, activeAvatar: avatarId });
    try {
      await fetch("/api/students", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, activeAvatar: avatarId })
      });
    } catch (e) {
      showMessage("Failed to equip avatar", "error");
    }
  };

  const handleLandPurchase = async () => {
    if (!studentData) return;
    const cost = settings?.landUpgradeCost ?? 1000;
    if (studentData.pointsBalance < cost) {
      showMessage(`Need ${cost} points to buy more land!`, "error");
      return;
    }

    setLoading(true);
    try {
      const newBalance = studentData.pointsBalance - cost;
      const currentLandSize = studentData.landSize ?? 50;
      const amount = settings?.landUpgradeAmount ?? 50;
      const newLandSize = currentLandSize + amount;
      
      const res = await fetch("/api/students", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, pointsBalance: newBalance, landSize: newLandSize })
      });
      if (!res.ok) throw new Error();
      
      await fetch("/api/withdrawals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user?.id, pointsDeducted: cost, rewardDescription: `Expanded land to ${newLandSize}x${newLandSize}` })
      });

      setStudentData({ ...studentData, pointsBalance: newBalance, landSize: newLandSize });
      showMessage("Land expanded!", "success");
    } catch (e) { showMessage("Failed to expand land", "error"); } finally { setLoading(false); }
  };

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

  const placePrefab = (anchorX: number, anchorY: number, anchorZ: number) => {
    const prefab = settings?.prefabs?.find((p: any) => p.id === activePrefabId);
    if (!prefab) return;

    let cost = 0;
    prefab.objects.forEach((o: any) => {
      if (o.type === 'item') {
        const iDef = shopItems.find(i => i.id === o.itemId);
        cost += iDef ? iDef.price : 0;
      } else if (o.type === 'large-roof') {
        cost += (studentData?.customColors?.includes(o.color) ? 0 : (settings?.builderRoofCost ?? 100));
      } else {
        cost += (studentData?.customColors?.includes(o.color) ? 0 : actualBlockCost);
      }
    });

    if (studentData.pointsBalance < cost) {
      setActionMessage({text: `Need ${cost} pts to place prefab!`, type: "error"});
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    const newObjs = prefab.objects.map((o: any) => ({
      ...o,
      x: anchorX + o.x,
      y: anchorY + o.y,
      z: anchorZ + o.z,
    }));
    
    const newWorld = [...objects, ...newObjs];
    setObjects(newWorld);
    saveObjects(newWorld, studentData.pointsBalance - cost, `Placed prefab ${prefab.name}`, cost);
  };

  /* ─── Click Handlers ─── */

  const handleGroundClick = (x: number, y: number, z: number) => {
    const landSize = (studentData?.landSize ?? 50) / 2;
    if (x < -landSize || x > landSize || z < -landSize || z > landSize) return;

    if (studentData?.isClassTime || isExploreMode) return;
    if (toolMode === 'eraser' || toolMode === 'paint' || toolMode === 'select') return;
    
    if ((toolMode === 'build' || toolMode === 'roof') && isEditingRef.current) {
      return;
    }
    
    if (toolMode === 'prefab' && activePrefabId) {
      placePrefab(x, y, z);
      return;
    }
    
    if (toolMode === 'roof') return;

    if (toolMode === 'build') placeBlock(x, y, z, 'block');
    if (toolMode === 'items') placeItem(x, y, z);
  };

  const paintObject = (obj: PlacedObject) => {
    if (obj.type === 'item') return;
    if (obj.color === activeColor && obj.materialType === activeMaterialType && obj.textureId === activeTexture) return;
    const newObjects = objects.map(o => (o.x === obj.x && o.y === obj.y && o.z === obj.z) ? { ...o, color: activeColor, materialType: activeMaterialType, textureId: activeTexture } : o);
    setObjects(newObjects);
    saveObjects(newObjects, studentData.pointsBalance, `Painted block/roof`, 0);
  };

  const rotateObject = (obj: PlacedObject) => {
    const newObjects = objectsRef.current.map(o => {
      if (o.x === obj.x && o.y === obj.y && o.z === obj.z) {
        if (o.type === 'large-roof') {
          return { ...o, w: o.d, d: o.w, rotationY: ((o.rotationY || 0) + Math.PI / 2) % (Math.PI * 2) };
        }
        return { ...o, rotationY: ((o.rotationY || 0) + Math.PI / 2) % (Math.PI * 2) };
      }
      return o;
    });
    setObjects(newObjects);
    saveObjects(newObjects, studentData?.pointsBalance || 0, `Rotated object`, 0);
  };

  const handleRoofSelection = (obj: PlacedObject) => {
    if (selectedRoofCorners.some(c => c.x === obj.x && c.y === obj.y && c.z === obj.z)) return;
    
    const newSelection = [...selectedRoofCorners, obj];
    if (newSelection.length < 4) {
      setSelectedRoofCorners(newSelection);
    } else {
      const xs = newSelection.map(o => o.x);
      const zs = newSelection.map(o => o.z);
      const ys = newSelection.map(o => o.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const maxY = Math.max(...ys);

      const width = maxX - minX + 1;
      const depth = maxZ - minZ + 1;
      const height = activeThickness;
      const cx = minX + (width - 1) / 2;
      const cz = minZ + (depth - 1) / 2;
      const cy = maxY + 1;

      placeLargeRoof(cx, cy, cz, width, depth, height, activeCurveness);
      setSelectedRoofCorners([]);
    }
  };

  const handleBlockClick = (obj: PlacedObject, faceNormal?: THREE.Vector3, point?: THREE.Vector3) => {
    if (studentData?.isClassTime || isExploreMode) return;
    if (toolMode === 'eraser') { eraseObject(obj); return; }
    if (toolMode === 'paint') { paintObject(obj); return; }
    if (toolMode === 'roof' && !isEditingRef.current) { handleRoofSelection(obj); return; }
    if (toolMode === 'rotate') { rotateObject(obj); return; }
    
    if ((toolMode === 'build' || toolMode === 'roof') && isEditingRef.current) {
      const id = getBlockId(obj);
      setSelectedBlockIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      return;
    }
    
    if (toolMode === 'select') {
      const id = getBlockId(obj);
      setPrefabSelectionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      return;
    }

    if (!faceNormal) return;
    
    // For large flat roofs, calculate adjacent block center accurately using point and normal
    let nx = obj.x + faceNormal.x;
    let nz = obj.z + faceNormal.z;
    let ny = obj.y + faceNormal.y;
    
    if (obj.type === 'large-roof' && point && faceNormal) {
      nx = Math.round(point.x + faceNormal.x * 0.5);
      nz = Math.round(point.z + faceNormal.z * 0.5);
    }

    if (faceNormal.y === 1) {
      const h = (obj.type === 'large-roof' ? obj.h : obj.thickness) || 1;
      ny = Number((obj.y + h).toFixed(2));
    } else if (faceNormal.y === -1) {
      ny = Number((obj.y - activeThickness).toFixed(2));
    } else {
      ny = obj.y;
    }

    const landSize = (studentData?.landSize ?? 50) / 2;
    if (nx < -landSize || nx > landSize || nz < -landSize || nz > landSize) return;

    if (toolMode === 'build') placeBlock(nx, ny, nz, 'block');
    if (toolMode === 'items') placeItem(nx, ny, nz);
  };

  const handleItemClick = (obj: PlacedObject) => {
    if (studentData?.isClassTime || isExploreMode) return;
    if (toolMode === 'eraser') { eraseObject(obj); return; }
    if (toolMode === 'paint') return; // Cannot paint items
    if (toolMode === 'roof') return; // Cannot use items as roof corners
    if (toolMode === 'rotate') { rotateObject(obj); return; }
    
    if (toolMode === 'select') {
      const id = getBlockId(obj);
      setPrefabSelectionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      return;
    }

    if (toolMode === 'build' && isEditingRef.current) return; // Ignore clicks on items when editing blocks

    const nx = obj.x + 1;
    const nz = obj.z;
    const landSize = (studentData?.landSize ?? 50) / 2;
    if (nx < -landSize || nx > landSize || nz < -landSize || nz > landSize) return;

    if (toolMode === 'build') placeBlock(nx, 0, nz, 'block');
    if (toolMode === 'items') placeItem(nx, 0, nz);
  };

  /* ─── Place Block ─── */

  const placeLargeRoof = (x: number, y: number, z: number, w: number, d: number, h: number, curveness: number) => {
    if (!studentData) return;
    const cost = actualRoofCost;
    if (studentData.pointsBalance < cost) { showMessage(`Need ${cost} pts!`, "error"); return; }

    const obj: PlacedObject = { x, y, z, color: activeColor, type: 'large-roof', w, d, h, curveness };
    const newObjects = [...objects, obj];
    const newBalance = studentData.pointsBalance - cost;
    setObjects(newObjects);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    const newSession = [...sessionPlaced, obj].slice(-3);
    setSessionPlaced(newSession);
    setUndosRemaining(newSession.length);
    saveObjects(newObjects, newBalance, "Placed a large roof", cost);
  };

  const placeBlock = (x: number, y: number, z: number, type: 'block' | 'roof') => {
    if (!studentData) return;
    const overlaps = objects.filter(o => o.x === x && o.y === y && o.z === z);
    if (overlaps.length > 0 && !overlaps.every(o => o.itemId === 'grass_field')) return;
    if (studentData.pointsBalance < actualBlockCost) { showMessage(`Need ${actualBlockCost} pts!`, "error"); return; }

    const obj: PlacedObject = { x, y, z, color: activeColor, type, width: activeWidth, thickness: activeThickness, depth: activeDepth, curveness: activeCurveness, rotationY: (activeRotation * Math.PI) / 180, blockShape: activeShape, materialType: activeMaterialType, textureId: activeTexture };
    const newObjects = [...objects, obj];
    const newBalance = studentData.pointsBalance - actualBlockCost;
    setObjects(newObjects);
    setStudentData({ ...studentData, pointsBalance: newBalance });
    const newSession = [...sessionPlaced, obj].slice(-3);
    setSessionPlaced(newSession);
    setUndosRemaining(newSession.length);
    saveObjects(newObjects, newBalance, "Placed a block in World Builder", actualBlockCost);
  };

  /* ─── Place Item ─── */

  const placeItem = (x: number, y: number, z: number) => {
    if (!studentData || !activeItemId) { showMessage("Select an item first!", "error"); return; }
    const itemDef = shopItems.find((i: any) => i.id === activeItemId);
    if (!itemDef) return;
    const overlaps = objects.filter(o => o.x === x && o.y === y && o.z === z);
    if (overlaps.length >= 2) return;
    if (overlaps.length === 1) {
      if (activeItemId === 'grass_field' && overlaps[0].itemId !== 'grass_field') {
        // Allow
      } else if (activeItemId !== 'grass_field' && overlaps[0].itemId === 'grass_field') {
        // Allow
      } else {
        return;
      }
    }
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
    const newObjects = objects.filter(o => o !== obj);
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
    
    let refund = 0;
    if (last.type === 'item' && last.itemId) {
      const itemDef = shopItems.find((i: any) => i.id === last.itemId);
      refund = itemDef?.cost ?? 0;
    } else if (last.type === 'large-roof') {
      refund = studentData.customColors?.includes(last.color) ? 0 : (settings?.builderRoofCost ?? 100);
    } else {
      refund = studentData.customColors?.includes(last.color) ? 0 : blockCost;
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

  const handleBuyColor = async (hexColor: string) => {
    const cost = settings?.customColorCost ?? 100;
    if (studentData.pointsBalance < cost) { showMessage(`Need ${cost} pts!`, "error"); return; }
    if (studentData.customColors?.includes(hexColor) || BASE_COLORS.some(c => c.color.toLowerCase() === hexColor.toLowerCase())) {
      showMessage("You already have this color!", "error"); return;
    }
    
    isSavingRef.current = true;
    const newBalance = studentData.pointsBalance - cost;
    const newCustomColors = [...(studentData.customColors || []), hexColor];
    setStudentData({ ...studentData, pointsBalance: newBalance, customColors: newCustomColors });
    setActiveColor(hexColor);
    setIsAddingColor(false);
    showMessage(`Unlocked color!`, "success");
    try {
      await fetch("/api/students", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, pointsBalance: newBalance, customColors: newCustomColors }) });
      await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user?.id, pointsDeducted: cost, rewardDescription: `Unlocked Custom Color: ${hexColor}` }) });
      setTimeout(() => { isSavingRef.current = false; }, 500);
    } catch (e) { isSavingRef.current = false; showMessage("Failed to unlock.", "error"); fetchData(); }
  };

  /* ─── Share ─── */

  const handleShare = () => {
    if (!user) return;
    const shareUrl = `${window.location.origin}/world/${user.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => showMessage("Share link copied to clipboard!", "success"))
      .catch(() => showMessage("Failed to copy link", "error"));
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

      {toolMode === 'roof' && selectedRoofCorners.length > 0 && !studentData?.isClassTime && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-sky-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg border border-sky-400 flex items-center gap-4">
          <span className="font-bold">Select 4 corners: {selectedRoofCorners.length}/4</span>
          <button onClick={() => setSelectedRoofCorners([])} className="bg-rose-500 hover:bg-rose-600 px-3 py-1 rounded-lg text-sm font-black transition-colors">
            Cancel
          </button>
        </div>
      )}

      {toolMode === 'items' && activeItemId && !showItemsMenu && !studentData?.isClassTime && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-amber-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg border border-amber-400 flex items-center gap-4">
          <span className="font-bold flex items-center gap-2">
            Selected: <span className="text-xl">{shopItems.find((i: any) => i.id === activeItemId)?.emoji}</span> {shopItems.find((i: any) => i.id === activeItemId)?.name}
          </span>
          <button onClick={() => setShowItemsMenu(true)} className="bg-amber-500 hover:bg-amber-400 px-3 py-1 rounded-lg text-sm font-black transition-colors">
            Change Item
          </button>
        </div>
      )}

      {studentData?.isClassTime && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-rose-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg font-black tracking-widest uppercase border border-rose-400">
          Class Time Active - Explore Mode
        </div>
      )}

      {/* ─── Left Panel: Points, Tools, Undo ─── */}
      {(!studentData?.isClassTime && !isExploreMode) && (
        <div className="absolute top-24 left-4 md:left-6 z-10 flex flex-col gap-3 pointer-events-none max-h-[calc(100vh-7rem)] overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden">
        {/* Points */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white pointer-events-auto shrink-0">
          <p className="text-xs text-sky-600 font-bold uppercase tracking-wider">Points</p>
          <p className="text-3xl font-black text-amber-500">{studentData?.pointsBalance || 0}</p>
        </div>

        {/* Tool Selector */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 pointer-events-auto shrink-0">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Block Shape</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'box', icon: 'Box' },
                        { id: 'wedge', icon: 'Wedge' },
                        { id: 'pyramid', icon: 'Pyramid' }
                      ].map((shape) => (
                        <button
                          key={shape.id}
                          onClick={() => handleShapeChange(shape.id as any)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                            activeShape === shape.id 
                              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {shape.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white pointer-events-auto flex flex-col overflow-hidden shrink-0">
          <button onClick={() => { setToolMode('build'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors ${toolMode === 'build' ? 'bg-sky-500 text-white' : 'text-sky-700 hover:bg-sky-50'}`}>
            <Hammer className="w-4 h-4" /> Build
          </button>
          <button onClick={() => { setToolMode('roof'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'roof' ? 'bg-sky-600 text-white' : 'text-sky-700 hover:bg-sky-50'}`}>
            <Triangle className="w-4 h-4" /> Roof
          </button>
          <button onClick={() => {
            if (toolMode === 'items') {
              setShowItemsMenu(!showItemsMenu);
              setShowVehiclesDropdown(false);
              setShowAnimalsDropdown(false);
            } else {
              setToolMode('items');
              setShowItemsMenu(true);
              setShowVehiclesDropdown(false);
              setShowAnimalsDropdown(false);
            }
          }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'items' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}>
            <TreePine className="w-4 h-4" /> Items
          </button>

          {/* Paint */}
          <button onClick={() => { setToolMode('paint'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'paint' ? 'bg-indigo-500 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}>
            <PaintBucket className="w-4 h-4" /> Paint
          </button>

          {/* Eraser */}
          <button onClick={() => { setToolMode('eraser'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'eraser' ? 'bg-rose-500 text-white' : 'text-rose-600 hover:bg-rose-50'}`}>
            <Eraser className="w-4 h-4" /> <span>Eraser</span>
          </button>
          
          {/* Select Tool (Prefabs) */}
          <button onClick={() => { setToolMode('select'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'select' ? 'bg-fuchsia-500 text-white' : 'text-fuchsia-600 hover:bg-fuchsia-50'}`}>
            <MousePointer2 className="w-4 h-4" /> <span>Select</span>
          </button>

          {/* Prefabs Tool */}
          <button onClick={() => { setToolMode('prefab'); setActiveItemId(null); setShowItemsMenu(true); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'prefab' ? 'bg-teal-500 text-white' : 'text-teal-600 hover:bg-teal-50'}`}>
            <Box className="w-4 h-4" /> <span>Prefabs</span>
          </button>

          {/* Rotate Tool */}
          <button onClick={() => setToolMode('rotate')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 rounded-b-2xl ${toolMode === 'rotate' ? 'bg-purple-500 text-white' : 'text-purple-600 hover:bg-purple-50'}`}>
            <RotateCw className="w-5 h-5" /> Rotate
          </button>
        </div>

        {/* Undo */}
        <button onClick={handleUndo} disabled={undosRemaining <= 0 || sessionPlaced.length === 0}
          className={`p-3 rounded-xl font-bold flex items-center justify-center gap-2 pointer-events-auto transition-colors shadow-lg border border-white shrink-0
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
      )}

      {/* ─── Bottom Bar: Color Palette / Item Palette ─── */}
      {(!studentData?.isClassTime && !isExploreMode && (toolMode === 'build' || toolMode === 'roof' || toolMode === 'paint' || toolMode === 'eraser' || toolMode === 'rotate' || toolMode === 'select' || toolMode === 'prefab' || (toolMode === 'items' && showItemsMenu))) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] md:w-auto max-w-3xl z-10 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white flex flex-wrap justify-center items-center gap-3 pointer-events-auto">
        
        {(toolMode === 'build' || toolMode === 'roof' || toolMode === 'paint' || toolMode === 'select') && (
          <>
            {(toolMode !== 'select') && (
              <div className="flex items-center gap-2 pr-3 border-r border-sky-200">
                <Pickaxe className="w-4 h-4 text-sky-600" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">{toolMode === 'paint' ? 'Color' : toolMode === 'roof' ? 'Roof' : 'Block'}</span>
                  <span className="text-xs font-black text-amber-500">{toolMode === 'paint' || isCustomColor ? 'Free' : `-${toolMode === 'roof' ? actualRoofCost : actualBlockCost} pts`}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1 items-center">
              {(toolMode === 'build' || toolMode === 'roof') && (
                <div className="flex items-center gap-3 pr-3 border-r border-sky-200">
                  <button onClick={() => {
                    if (isEditingBlocks) {
                      handleEditSave();
                      setSelectedBlockIds([]);
                    }
                    setIsEditingBlocks(!isEditingBlocks);
                  }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isEditingBlocks ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {isEditingBlocks ? 'Done Editing' : (toolMode === 'roof' ? 'Edit Roofs' : 'Edit Blocks')}
                  </button>

                  {toolMode === 'build' && (
                    <div className="flex flex-col gap-1 w-24">
                      <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase">
                        <span>Width</span>
                        <span>{activeWidth}m</span>
                      </div>
                      <input type="range" min="0.1" max="1" step="0.1" value={activeWidth} onChange={e => handleWidthChange(parseFloat(e.target.value))} onPointerUp={handleEditSave} onKeyUp={handleEditSave} className="accent-sky-500" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 w-24">
                    <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase">
                      <span>Height</span>
                      <span>{activeThickness}m</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.1" value={activeThickness} onChange={e => handleThicknessChange(parseFloat(e.target.value))} onPointerUp={handleEditSave} onKeyUp={handleEditSave} className="accent-sky-500" />
                  </div>

                  {toolMode === 'build' && (
                    <div className="flex flex-col gap-1 w-24">
                      <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase">
                        <span>Depth</span>
                        <span>{activeDepth}m</span>
                      </div>
                      <input type="range" min="0.1" max="1" step="0.1" value={activeDepth} onChange={e => handleDepthChange(parseFloat(e.target.value))} onPointerUp={handleEditSave} onKeyUp={handleEditSave} className="accent-sky-500" />
                    </div>
                  )}

                  {toolMode === 'roof' && (
                    <div className="flex flex-col gap-1 w-24">
                      <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase">
                        <span>Curve</span>
                        <span>{activeCurveness}</span>
                      </div>
                      <input type="range" min="0" max="4" step="1" value={activeCurveness} onChange={e => handleCurvenessChange(parseInt(e.target.value))} onPointerUp={handleEditSave} onKeyUp={handleEditSave} className="accent-sky-500" />
                    </div>
                  )}
                  
                  {(isEditingBlocks && selectedBlockIds.length > 0) && (
                    <div className="flex flex-col gap-1 w-24 border-l border-sky-100 pl-3">
                      <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase">
                        <span>Rot</span>
                        <span>{activeRotation}°</span>
                      </div>
                      <input type="range" min="0" max="360" step="15" value={activeRotation} onChange={e => handleRotationChange(parseInt(e.target.value))} onPointerUp={handleEditSave} onKeyUp={handleEditSave} className="accent-sky-500" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 mb-2 w-full max-w-md bg-white p-1 rounded-xl shadow-sm border border-gray-100 shrink-0">
                <button onClick={() => setActiveMaterialType('color')} className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition-colors ${activeMaterialType === 'color' ? 'bg-sky-500 text-white' : 'hover:bg-gray-100'}`}>Color</button>
                <button onClick={() => setActiveMaterialType('texture')} className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition-colors ${activeMaterialType === 'texture' ? 'bg-sky-500 text-white' : 'hover:bg-gray-100'}`}>Texture</button>
                <button onClick={() => setActiveMaterialType('glass')} className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition-colors ${activeMaterialType === 'glass' ? 'bg-sky-500 text-white' : 'hover:bg-gray-100'}`}>Glass</button>
              </div>
              {activeMaterialType === 'color' && (
                <>
                  {BASE_COLORS.map((b) => (
                    <button key={b.id}
                      onClick={() => handleColorChange(b.color)}
                      className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeColor === b.color ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: b.color }} title={b.name}
                    />
                  ))}
                  
                  {studentData?.customColors?.map((color: string, idx: number) => (
                    <button key={`custom-${idx}`}
                      onClick={() => handleColorChange(color)}
                      className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeColor === color ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} title={color}
                    />
                  ))}

                  {isAddingColor ? (
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-sky-200">
                      <input type="color" value={newColorInput} onChange={e => setNewColorInput(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                      <button onClick={() => handleBuyColor(newColorInput)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-2 py-1.5 rounded-lg flex flex-col leading-none items-center shadow-sm">
                        <span>BUY</span>
                        <span>{settings?.customColorCost ?? 100} pts</span>
                      </button>
                      <button onClick={() => setIsAddingColor(false)} className="text-gray-400 hover:text-rose-500 px-1">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsAddingColor(true)}
                      className="relative shrink-0 w-10 h-10 rounded-xl border-[3px] border-dashed border-sky-300 hover:border-sky-500 text-sky-400 hover:text-sky-500 flex items-center justify-center transition-colors bg-sky-50/50"
                      title="Add Custom Color">
                      <span className="text-xl font-bold">+</span>
                    </button>
                  )}
                </>
              )}

              {activeMaterialType === 'texture' && (
                <>
                  {AVAILABLE_TEXTURES.map((t) => (
                    <button key={t.id}
                      onClick={() => setActiveTexture(t.id)}
                      className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeTexture === t.id ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundImage: `url(${t.url})`, backgroundSize: 'cover' }} title={t.name}
                    />
                  ))}
                </>
              )}
              
              {activeMaterialType === 'glass' && (
                <div className="flex items-center gap-2">
                   <button
                      onClick={() => handleColorChange("#ADD8E6")}
                      className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeColor === "#ADD8E6" ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: "#ADD8E6", opacity: 0.6 }} title="Clear Glass"
                    />
                   <button
                      onClick={() => handleColorChange("#1f2937")}
                      className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeColor === "#1f2937" ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: "#1f2937", opacity: 0.8 }} title="Tinted Glass"
                    />
                </div>
              )}
            </div>
          </>
        )}

        {toolMode === 'select' && prefabSelectionIds.length > 0 && (
          <div className="flex gap-2">
            <button 
              onClick={handleSavePrefab}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 transition-colors shrink-0">
              <Save className="w-5 h-5" /> Save Group as Prefab ({prefabSelectionIds.length} items)
            </button>
          </div>
        )}

        {toolMode === 'items' && showItemsMenu && (
          <div className="flex flex-wrap justify-center gap-2 pb-1 px-1 relative items-center w-full">
            {shopItems.filter((i: any) => !['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep', 'cat', 'horse', 'cow', 'goat', 'pig', 'dog', 'chicken', 'tree', 'pine_tree_big', 'pine_tree_small', 'oak_tree_big', 'oak_tree_small', 'palm_tree', 'bench', 'bed', 'table', 'stool', 'sofa', 'chair', 'bookshelf', 'wardrobe', 'street_light', 'fountain', 'park_bench', 'gazebo', 'fire_pit', 'picnic_table', 'hedge', 'bird_bath', 'mailbox', 'trash_can'].includes(i.id)).map((item: any) => (
              <button key={item.id}
                onClick={() => { setActiveItemId(item.id); setShowItemsMenu(false); }}
                className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                title={`${item.name} — ${item.cost} pts`}>
                <span className="text-2xl leading-none">{item.emoji}</span>
                <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
              </button>
            ))}

            {/* Vehicles Dropdown Button */}
            {shopItems.some((i: any) => ['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'].includes(i.id)) && (
              <div className="relative shrink-0 flex flex-col items-center">
                 <button 
                    onClick={() => setShowVehiclesDropdown(!showVehiclesDropdown)}
                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'].includes(activeItemId || '') ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white'}`}
                    title="Vehicles Menu">
                    <span className="text-2xl leading-none">🚗</span>
                    <span className="text-[10px] font-black text-gray-600">Vehicles</span>
                    <span className="text-[9px] font-black text-amber-500">Menu</span>
                 </button>
                 
                 <AnimatePresence>
                   {showVehiclesDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-sky-200 z-50 w-max origin-bottom items-center">
                         {shopItems.filter((i: any) => ['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'].includes(i.id)).map((item: any) => (
                            <button key={item.id}
                              onClick={() => { setActiveItemId(item.id); setShowVehiclesDropdown(false); setShowItemsMenu(false); }}
                              className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                              title={`${item.name} — ${item.cost} pts`}>
                              <span className="text-2xl leading-none">{item.emoji}</span>
                              <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                              <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
                            </button>
                         ))}
                      </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            )}

            {/* Pets & Animals Dropdown Button */}
            {shopItems.some((i: any) => ['cat', 'horse', 'cow', 'goat', 'pig', 'dog', 'chicken'].includes(i.id)) && (
              <div className="relative shrink-0 flex flex-col items-center">
                 <button 
                    onClick={() => setShowAnimalsDropdown(!showAnimalsDropdown)}
                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${['cat', 'horse', 'cow', 'goat', 'pig', 'dog', 'chicken'].includes(activeItemId || '') ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white'}`}
                    title="Pets & Animals Menu">
                    <span className="text-2xl leading-none">🐕</span>
                    <span className="text-[10px] font-black text-gray-600">Animals</span>
                    <span className="text-[9px] font-black text-amber-500">Menu</span>
                 </button>
                 
                 <AnimatePresence>
                   {showAnimalsDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-sky-200 z-50 w-max origin-bottom items-center">
                         {shopItems.filter((i: any) => ['cat', 'horse', 'cow', 'goat', 'pig', 'dog', 'chicken'].includes(i.id)).map((item: any) => (
                            <button key={item.id}
                              onClick={() => { setActiveItemId(item.id); setShowAnimalsDropdown(false); setShowItemsMenu(false); }}
                              className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                              title={`${item.name} — ${item.cost} pts`}>
                              <span className="text-2xl leading-none">{item.emoji}</span>
                              <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                              <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
                            </button>
                         ))}
                      </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            )}

            {/* Trees Dropdown Button */}
            {shopItems.some((i: any) => ['tree', 'pine_tree_big', 'pine_tree_small', 'oak_tree_big', 'oak_tree_small', 'palm_tree'].includes(i.id)) && (
              <div className="relative shrink-0 flex flex-col items-center">
                 <button 
                    onClick={() => setShowTreesDropdown(!showTreesDropdown)}
                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${['tree', 'pine_tree_big', 'pine_tree_small', 'oak_tree_big', 'oak_tree_small', 'palm_tree'].includes(activeItemId || '') ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white'}`}
                    title="Trees Menu">
                    <span className="text-2xl leading-none">🌲</span>
                    <span className="text-[10px] font-black text-gray-600">Trees</span>
                    <span className="text-[9px] font-black text-amber-500">Menu</span>
                 </button>
                 
                 <AnimatePresence>
                   {showTreesDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-sky-200 z-50 w-max origin-bottom items-center">
                         {shopItems.filter((i: any) => ['tree', 'pine_tree_big', 'pine_tree_small', 'oak_tree_big', 'oak_tree_small', 'palm_tree'].includes(i.id)).map((item: any) => (
                            <button key={item.id}
                              onClick={() => { setActiveItemId(item.id); setShowTreesDropdown(false); setShowItemsMenu(false); }}
                              className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                              title={`${item.name} — ${item.cost} pts`}>
                              <span className="text-2xl leading-none">{item.emoji}</span>
                              <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                              <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
                            </button>
                         ))}
                      </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            )}

            {/* Furnitures Dropdown Button */}
            {shopItems.some((i: any) => ['bench', 'bed', 'table', 'stool', 'sofa', 'chair', 'bookshelf', 'wardrobe'].includes(i.id)) && (
              <div className="relative shrink-0 flex flex-col items-center">
                 <button 
                    onClick={() => setShowFurnituresDropdown(!showFurnituresDropdown)}
                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${['bench', 'bed', 'table', 'stool', 'sofa', 'chair', 'bookshelf', 'wardrobe'].includes(activeItemId || '') ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white'}`}
                    title="Furnitures Menu">
                    <span className="text-2xl leading-none">🛋️</span>
                    <span className="text-[10px] font-black text-gray-600">Furnitures</span>
                    <span className="text-[9px] font-black text-amber-500">Menu</span>
                 </button>
                 
                 <AnimatePresence>
                   {showFurnituresDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-sky-200 z-50 w-max origin-bottom items-center">
                         {shopItems.filter((i: any) => ['bench', 'bed', 'table', 'stool', 'sofa', 'chair', 'bookshelf', 'wardrobe'].includes(i.id)).map((item: any) => (
                            <button key={item.id}
                              onClick={() => { setActiveItemId(item.id); setShowFurnituresDropdown(false); setShowItemsMenu(false); }}
                              className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                              title={`${item.name} — ${item.cost} pts`}>
                              <span className="text-2xl leading-none">{item.emoji}</span>
                              <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                              <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
                            </button>
                         ))}
                      </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            )}

            {/* Landscaping Dropdown Button */}
            {shopItems.some((i: any) => ['street_light', 'fountain', 'park_bench', 'gazebo', 'fire_pit', 'picnic_table', 'hedge', 'bird_bath', 'mailbox', 'trash_can'].includes(i.id)) && (
              <div className="relative shrink-0 flex flex-col items-center">
                 <button 
                    onClick={() => setShowLandscapeDropdown(!showLandscapeDropdown)}
                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${['street_light', 'fountain', 'park_bench', 'gazebo', 'fire_pit', 'picnic_table', 'hedge', 'bird_bath', 'mailbox', 'trash_can'].includes(activeItemId || '') ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white'}`}
                    title="Landscaping Menu">
                    <span className="text-2xl leading-none">⛲</span>
                    <span className="text-[10px] font-black text-gray-600">Outdoors</span>
                    <span className="text-[9px] font-black text-amber-500">Menu</span>
                 </button>
                 
                 <AnimatePresence>
                   {showLandscapeDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-sky-200 z-50 w-max origin-bottom items-center">
                         {shopItems.filter((i: any) => ['street_light', 'fountain', 'park_bench', 'gazebo', 'fire_pit', 'picnic_table', 'hedge', 'bird_bath', 'mailbox', 'trash_can'].includes(i.id)).map((item: any) => (
                            <button key={item.id}
                              onClick={() => { setActiveItemId(item.id); setShowLandscapeDropdown(false); setShowItemsMenu(false); }}
                              className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activeItemId === item.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                              title={`${item.name} — ${item.cost} pts`}>
                              <span className="text-2xl leading-none">{item.emoji}</span>
                              <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                              <span className="text-[9px] font-black text-amber-500">-{item.cost}</span>
                            </button>
                         ))}
                      </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {toolMode === 'prefab' && (
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1 items-center w-full">
            <div className="flex items-center gap-2 pr-3 border-r border-sky-200 shrink-0">
              <Box className="w-4 h-4 text-sky-600" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">Prefabs</span>
              </div>
            </div>
            {settings?.prefabs?.length ? settings.prefabs.map((p: any) => {
              // Calculate prefab cost
              let cost = 0;
              p.objects.forEach((o: any) => {
                if (o.type === 'item') {
                  const iDef = shopItems.find(i => i.id === o.itemId);
                  cost += iDef ? iDef.price : 0;
                } else if (o.type === 'large-roof') {
                  cost += (studentData?.customColors?.includes(o.color) ? 0 : (settings?.builderRoofCost ?? 100));
                } else {
                  cost += (studentData?.customColors?.includes(o.color) ? 0 : actualBlockCost);
                }
              });

              return (
                <button key={p.id} onClick={() => setActivePrefabId(p.id)}
                  className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] transition-transform hover:scale-105 ${activePrefabId === p.id ? 'border-amber-500 bg-amber-50 scale-105' : 'border-transparent bg-white'}`}
                  title={p.name}>
                  <span className="text-2xl leading-none">{p.emoji || "📦"}</span>
                  <span className="text-[10px] font-black text-gray-600">{p.name}</span>
                  <span className="text-[9px] font-black text-amber-500">-{cost} pts</span>
                </button>
              );
            }) : (
              <div className="text-sm font-bold text-gray-400 px-3 py-2">No prefabs saved yet. Use Select tool to save one!</div>
            )}
          </div>
        )}

        {toolMode === 'eraser' && (
          <div className="flex items-center gap-3 text-rose-600 font-bold text-sm px-2">
            <Eraser className="w-5 h-5" />
            <span>Click any block or item to erase it</span>
            {blockRefund > 0 && <span className="text-emerald-500 text-xs font-black">(blocks: +{blockRefund} pts)</span>}
          </div>
        )}

        {toolMode === 'rotate' && (
          <div className="flex items-center gap-3 text-purple-600 font-bold text-sm px-2">
            <RotateCw className="w-5 h-5" />
            <span>Click any block or item to rotate it</span>
          </div>
        )}
      </div>
      )}

      {/* ─── Top Right Actions ─── */}
      <div className="absolute top-24 right-4 md:right-6 z-10 flex flex-col items-end gap-2">
        {!studentData?.isClassTime && (
          <>
            <button onClick={() => setShowAvatars(!showAvatars)} className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-fuchsia-600 hover:text-fuchsia-800 transition-colors pointer-events-auto flex items-center justify-center" title="Avatar Shop">
              <span className="text-xl leading-none">👤</span>
            </button>
            <button onClick={() => setShowLandUpgrade(!showLandUpgrade)} className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-emerald-600 hover:text-emerald-800 transition-colors pointer-events-auto flex items-center justify-center" title="Expand Land">
              <span className="text-xl leading-none">🗺️</span>
            </button>
            <button onClick={() => setIsExploreMode(!isExploreMode)} className={`bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg transition-colors pointer-events-auto flex items-center justify-center ${isExploreMode ? 'text-amber-600 hover:text-amber-800 border-2 border-amber-400' : 'text-slate-600 hover:text-slate-800'}`} title="Toggle Explore Mode">
              {isExploreMode ? <X className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
            </button>
          </>
        )}
        <button onClick={handleShare} className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-emerald-600 hover:text-emerald-800 transition-colors pointer-events-auto flex items-center justify-center" title="Share World">
          <Share2 className="w-5 h-5" />
        </button>
        <button onClick={() => setShowDirections(!showDirections)} className="hidden md:flex bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-sky-600 hover:text-sky-800 transition-colors pointer-events-auto">
          <Info className="w-5 h-5" />
        </button>
        <AnimatePresence>
          {showDirections && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white text-sm font-bold text-sky-800 max-w-[220px] pointer-events-auto">
              <p className="mb-2">🖱️ Left Click + Drag to pan</p>
              <p className="mb-2">🖱️ Right Click + Drag to rotate</p>
              <p className="mb-2">🖱️ Scroll to zoom at cursor</p>
              <p className="mb-2">🖱️ Click grid or object to {toolMode === 'eraser' ? 'erase' : toolMode === 'rotate' ? 'rotate' : 'place'}</p>
              <p className="text-xs text-amber-600">Tip: For large roofs, click 4 corner blocks.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Avatar Shop Overlay ─── */}
      <AnimatePresence>
        {showAvatars && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-24 right-20 z-40 bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-fuchsia-200 pointer-events-auto max-w-[300px]">
            <h3 className="font-black text-fuchsia-800 mb-3 text-center flex items-center justify-center gap-2">
              <span>Avatar Shop</span>
            </h3>
            <div className="flex flex-col gap-3">
              {AVAILABLE_AVATARS.map((avatar) => {
                const isUnlocked = (studentData?.unlockedAvatars || ['boy']).includes(avatar.id);
                const isEquipped = (studentData?.activeAvatar || 'boy') === avatar.id;
                
                return (
                  <div key={avatar.id} className="flex items-center justify-between p-2 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl border border-slate-100">
                        {avatar.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm">{avatar.name}</span>
                        {!isUnlocked && <span className="text-[10px] font-black text-amber-500">{avatar.cost} pts</span>}
                      </div>
                    </div>
                    <div>
                      {isEquipped ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">Equipped</span>
                      ) : isUnlocked ? (
                        <button onClick={() => handleAvatarEquip(avatar.id)} className="px-3 py-1 bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 rounded-lg text-xs font-bold transition-colors">
                          Equip
                        </button>
                      ) : (
                        <button onClick={() => handleAvatarPurchase(avatar.id, avatar.cost)} className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
                          Buy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Land Upgrade Overlay ─── */}
      <AnimatePresence>
        {showLandUpgrade && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-36 right-20 z-40 bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-emerald-200 pointer-events-auto min-w-[200px]">
            <h3 className="font-black text-emerald-800 mb-3 text-center flex items-center justify-center gap-2">
              <span>Expand Land</span>
            </h3>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-slate-600 text-center">
                Current Size: {studentData?.landSize ?? 50}x{studentData?.landSize ?? 50}
              </p>
              <button 
                onClick={handleLandPurchase} 
                className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-transform hover:scale-105"
              >
                Buy (+{settings?.landUpgradeAmount ?? 50})
                <br />
                {settings?.landUpgradeCost ?? 1000} pts
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mobile D-Pad (Explore Mode) ─── */}
      {isExploreMode && <MobileDPad />}

      {/* ─── Driving Mode Exit UI ─── */}
      {drivingVehicle && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <button 
            onClick={handleExitVehicle}
            className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-2xl border-4 border-white transition-transform hover:scale-105 animate-bounce"
            title="Exit Vehicle"
          >
            <LogOut className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* ─── 3D Canvas ─── */}
      <main className={`flex-1 w-full h-full ${cursorClass}`}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
          draggedRef.current = false;
        }}
        onPointerMove={(e) => {
          handleHighlightPointerMove(e);
          if (!pointerDownPos.current) return;
          const dx = e.clientX - pointerDownPos.current.x;
          const dy = e.clientY - pointerDownPos.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            draggedRef.current = true;
          }
        }}
        onPointerUp={(e) => {
          handleHighlightPointerUp(e);
          pointerDownPos.current = null;
        }}
      >
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />
          
          {settings?.builderQuote && (
            <Text
              position={[0, 15, -60]}
              fontSize={8}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.2}
              outlineColor="#b45309"
              castShadow
            >
              {settings.builderQuote}
            </Text>
          )}

          <CameraBounds landSize={studentData?.landSize ?? 50} />
          <Ground landSize={studentData?.landSize ?? 50} onClick={handleGroundClick} isDragging={isDraggingFn} />
          {isExploreMode && <BakeShadows />}
          
          {(() => {
            const validObjects = objects.filter(o => o !== drivingVehicle);
            const items = validObjects.filter(o => o.type === 'item');

            const getBoxProps = (data: PlacedObject) => {
              if (data.type === 'large-roof') {
                const h = data.h || 1;
                return {
                  position: [data.x, data.y - 0.5 + h / 2, data.z] as [number, number, number],
                  scale: [data.w || 1, h, data.d || 1] as [number, number, number],
                  rotation: [data.rotationX || 0, data.rotationY || 0, data.rotationZ || 0] as [number, number, number]
                };
              } else {
                const width = data.width || 1;
                const thickness = data.thickness || 1;
                const depth = data.depth || 1;
                return {
                  position: [data.x, data.y - 0.5 + thickness / 2, data.z] as [number, number, number],
                  scale: [width, thickness, depth] as [number, number, number],
                  rotation: [data.rotationX || 0, data.rotationY || 0, data.rotationZ || 0] as [number, number, number]
                };
              }
            };
            
            const curvenessLevels = [0, 1, 2, 3, 4];
            const boxShapes = ['box', undefined];

            const blockMaterials = [
              { type: 'color', id: 'color', transparent: false, glass: false, texture: null },
              { type: 'glass', id: 'glass', transparent: true, glass: true, texture: null },
              { type: 'texture', id: 'wood', transparent: false, glass: false, texture: TEXTURES?.wood },
              { type: 'texture', id: 'stone', transparent: false, glass: false, texture: TEXTURES?.stone },
              { type: 'texture', id: 'brick', transparent: false, glass: false, texture: TEXTURES?.brick },
              { type: 'texture', id: 'shingles', transparent: false, glass: false, texture: TEXTURES?.shingles },
              { type: 'texture', id: 'tile', transparent: false, glass: false, texture: TEXTURES?.tile },
            ];

            return (
              <>
                {blockMaterials.map(mat => {
                  let subset;
                  if (mat.type === 'color') {
                    subset = validObjects.filter(o => (o.materialType === 'color' || !o.materialType) && o.color !== "#ADD8E6");
                  } else {
                    subset = validObjects.filter(o => o.materialType === 'texture' && o.textureId === mat.id);
                  }
                  
                  if (subset.length === 0) return null;
                  
                  const boxes = subset.filter(o => (!o.type || o.type === 'block' || o.type === 'large-roof'));
                  const roofs = subset.filter(o => o.type === 'roof');

                  return (
                    <group key={`mat-${mat.id}`}>
                      {/* Boxes */}
                      {curvenessLevels.map(level => {
                        const blocks = boxes.filter(o => boxShapes.includes(o.blockShape) && Math.round(o.curveness || 0) === level);
                        if (blocks.length === 0) return null;
                        return (
                          <Instances key={`bx-${level}`} limit={100000} castShadow receiveShadow>
                            <primitive object={getCurvedGeometry(level)} attach="geometry" />
                            <meshStandardMaterial map={mat.texture || undefined} transparent={mat.transparent} opacity={mat.transparent ? 0.6 : 1} />
                            {blocks.map((data, idx) => {
                              const props = getBoxProps(data);
                              return (
                                <Instance key={`b-${level}-${idx}`} position={props.position} scale={props.scale} rotation={props.rotation} color={mat.type === 'texture' ? "#ffffff" : data.color}
                                  onClick={(e) => { if (isDraggingFn()) return; e.stopPropagation(); handleBlockClick(data, e.face?.normal, e.point); }} />
                              );
                            })}
                          </Instances>
                        );
                      })}

                      {/* Wedges */}
                      {(() => {
                        const blocks = boxes.filter(o => o.blockShape === 'wedge');
                        if (blocks.length === 0) return null;
                        return (
                          <Instances limit={100000} castShadow receiveShadow>
                            <primitive object={getWedgeGeometry()} attach="geometry" />
                            <meshStandardMaterial map={mat.texture || undefined} transparent={mat.transparent} opacity={mat.transparent ? 0.6 : 1} />
                            {blocks.map((data, idx) => {
                              const props = getBoxProps(data);
                              return (
                                <Instance key={`w-${idx}`} position={props.position} scale={props.scale} rotation={props.rotation} color={mat.type === 'texture' ? "#ffffff" : data.color}
                                  onClick={(e) => { if (isDraggingFn()) return; e.stopPropagation(); handleBlockClick(data, e.face?.normal, e.point); }} />
                              );
                            })}
                          </Instances>
                        );
                      })()}

                      {/* Pyramids */}
                      {(() => {
                        const blocks = boxes.filter(o => o.blockShape === 'pyramid');
                        if (blocks.length === 0) return null;
                        return (
                          <Instances limit={100000} castShadow receiveShadow>
                            <primitive object={getPyramidGeometry()} attach="geometry" />
                            <meshStandardMaterial map={mat.texture || undefined} transparent={mat.transparent} opacity={mat.transparent ? 0.6 : 1} />
                            {blocks.map((data, idx) => {
                              const props = getBoxProps(data);
                              return (
                                <Instance key={`p-${idx}`} position={props.position} scale={props.scale} rotation={props.rotation} color={mat.type === 'texture' ? "#ffffff" : data.color}
                                  onClick={(e) => { if (isDraggingFn()) return; e.stopPropagation(); handleBlockClick(data, e.face?.normal, e.point); }} />
                              );
                            })}
                          </Instances>
                        );
                      })()}
                      
                      {/* Roofs */}
                      {curvenessLevels.map(level => {
                        const rfs = roofs.filter(o => Math.round(o.curveness || 0) === level);
                        if (rfs.length === 0) return null;
                        const segments = level === 0 ? 4 : level === 1 ? 8 : level === 2 ? 16 : level === 3 ? 24 : 32;
                        return (
                          <Instances key={`rf-${level}`} limit={100000} castShadow receiveShadow>
                            <primitive object={getRoofGeometry(segments)} attach="geometry" />
                            <meshStandardMaterial map={mat.texture || undefined} transparent={mat.transparent} opacity={mat.transparent ? 0.6 : 1} />
                            {rfs.map((data, idx) => (
                              <Instance key={`r-${level}-${idx}`}
                                position={[data.x, data.y - 0.5 + (data.thickness || 1) / 2, data.z]}
                                rotation={[0, Math.PI / 4, 0]}
                                scale={[data.width || 1, data.thickness || 1, data.depth || 1]}
                                color={mat.type === 'texture' ? "#ffffff" : data.color}
                                onClick={(e) => { if (isDraggingFn()) return; e.stopPropagation(); handleBlockClick(data, e.face?.normal, e.point); }}
                              />
                            ))}
                          </Instances>
                        );
                      })}
                    </group>
                  );
                })}

                {/* Selected Highlights */}
                {validObjects.map((data, idx) => {
                  const isBlockEdited = selectedBlockIds.includes(getBlockId(data));
                  const isPrefabSelected = prefabSelectionIds.includes(getBlockId(data));
                  if (!isBlockEdited && !isPrefabSelected) return null;
                  
                  const isItem = data.type === 'item';
                  if (isItem && !isPrefabSelected) return null;

                  const props = isItem ? { 
                    position: [data.x, data.y, data.z] as [number, number, number], 
                    scale: [1, 1, 1] as [number, number, number], 
                    rotation: [0, data.rotationY || 0, 0] as [number, number, number] 
                  } : getBoxProps(data);
                  
                  return (
                    <mesh 
                      key={`sel-${idx}`} 
                      position={props.position} 
                      rotation={props.rotation}
                      onPointerDown={(e) => handleHighlightPointerDown(e, data)}
                      raycast={(toolMode === 'build' && isEditingBlocks) ? undefined : () => null}
                    >
                      <boxGeometry args={[props.scale[0] + 0.05, props.scale[1] + 0.05, props.scale[2] + 0.05]} />
                      <meshBasicMaterial color={isPrefabSelected ? "#d946ef" : "#eab308"} wireframe />
                    </mesh>
                  );
                })}

                {items.map((obj, idx) => {
                  const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
                  return <ItemObject key={idx} data={obj} itemDef={itemDef} onClick={handleItemClick} isDragging={isDraggingFn} onEnterVehicle={() => handleEnterVehicle(obj)} isExploreMode={isExploreMode} />;
                })}
              </>
            );
          })()}

          {selectedRoofCorners.map((corner, idx) => (
            <mesh key={`corner-${idx}`} position={[corner.x, corner.y, corner.z]}>
              <boxGeometry args={[1.1, 1.1, 1.1]} />
              <meshBasicMaterial color="#ef4444" wireframe />
            </mesh>
          ))}

          {isExploreMode && <Player 
            objects={objects.filter(o => o !== drivingVehicle)} 
            activeAvatar={studentData?.activeAvatar || 'boy'} 
            drivingVehicle={drivingVehicle}
            landSize={studentData?.landSize ?? 50}
            vehicleMesh={
              drivingVehicle ? 
              <ItemObject 
                data={{ ...drivingVehicle, x: 0, y: 0.5, z: 0, rotationY: 0 }} 
                itemDef={shopItems.find((i: any) => i.id === drivingVehicle.itemId)} 
                onClick={() => {}} 
                isDragging={() => false} 
              /> : undefined
            }
          />}

          {(toolMode === 'select' && prefabSelectionIds.length > 0) && (
            <GroupGizmo 
              objects={objects} 
              selectedIds={prefabSelectionIds} 
              onUpdateObjects={setObjects} 
              isGizmoDragging={isGizmoDragging} 
              setIsGizmoDragging={setIsGizmoDragging} 
              onDragEnd={() => saveObjects(objectsRef.current, studentData?.pointsBalance || 0, "Resized/Rotated Prefab Group", 0)}
            />
          )}

          <MapControls 
            makeDefault 
            maxPolarAngle={Math.PI / 2 - 0.05} 
            enablePan={!isExploreMode && !isGizmoDragging} 
            rotateSpeed={0.5}
            maxDistance={(studentData?.landSize ?? 50) * 1.5}
            enabled={!isExploreMode && !isGizmoDragging}
          />
        </Canvas>
      </main>
    </div>
  );
}
