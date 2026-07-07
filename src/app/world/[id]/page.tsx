"use client";

import { useEffect, useState, use, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky, MapControls, Html, Text, BakeShadows, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Copy, Check, Gamepad2, X, LogIn, LogOut } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Player, usePlayerKeyboardControls, MobileDPad, playerState } from "@/components/Player";
import { CameraBounds } from "@/components/CameraBounds";
import { getCurvedGeometry, getRoofGeometry, getWedgeGeometry, getPyramidGeometry } from "@/components/BlockGeometries";

export type PlacedObject = {
  x: number; y: number; z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  w?: number; d?: number; h?: number;
  thickness?: number;
  depth?: number;
  width?: number;
  curveness?: number;
  blockShape?: 'box' | 'wedge' | 'pyramid';
  isOpen?: boolean;
  materialType?: 'color' | 'texture' | 'glass';
  textureId?: string;
};

/* ─── 3D Components (Read-Only) ─── */

function Ground({ landSize = 50 }: { landSize?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[landSize, landSize]} />
      <meshStandardMaterial color="#4ade80" />
      <gridHelper args={[landSize, landSize, "#22c55e", "#22c55e"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
}

function Block({ data }: { data: PlacedObject }) {
  return (
    <mesh position={[data.x, data.y, data.z]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}

function RoofBlock({ data }: { data: PlacedObject }) {
  return (
    <mesh position={[data.x, data.y, data.z]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
      <coneGeometry args={[0.71, 1, 4]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}

function LargeRoofBlock({ data }: { data: PlacedObject }) {
  const { w = 1, h = 1, d = 1 } = data;
  return (
    <mesh position={[data.x, data.y, data.z]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
    </mesh>
  );
}

function InteractiveDoor({ data, isExploreMode }: { data: PlacedObject; isExploreMode?: boolean }) {
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
    <group position={[data.x, data.y - 0.5, data.z]} rotation={[0, baseRotation, 0]} onDoubleClick={handleDoubleClick}>
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

function ItemObject({ data, itemDef, onEnterVehicle, isExploreMode }: { data: PlacedObject, itemDef: any, onEnterVehicle?: () => void, isExploreMode?: boolean }) {
  const w = itemDef?.width ?? 1;
  const h = itemDef?.height ?? 1;
  const d = itemDef?.depth ?? 1;
  // Position the item so its base sits on the ground (y=0 means bottom of item is at y=-0.5)
  const yPos = data.y + (h / 2) - 0.5;

  const handleClick = (e: any) => {
    e.stopPropagation();
  };

  const itemId = data.itemId || "";
  const isVehicle = ['car', 'lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'].includes(itemId);

  const wrapIfVehicle = (node: React.ReactNode) => {
    if (isVehicle && onEnterVehicle) {
      return <InteractiveVehicle data={data} onEnterVehicle={onEnterVehicle} isExploreMode={isExploreMode}>{node}</InteractiveVehicle>;
    }
    return <>{node}</>;
  };

  // Helper to wrap custom geometry
  const ModelWrapper = ({ children }: { children: React.ReactNode }) => wrapIfVehicle(
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

  if (isMatch("hedge", "hedge")) {
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

  if (isMatch("table_and_chair", "table and chair")) {
    return (
      <ModelWrapper>
        {/* Table */}
        <mesh position={[0, 0.9, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.1, 1.0]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {[[-0.6, 0.45, -0.8], [0.6, 0.45, -0.8], [-0.6, 0.45, 0], [0.6, 0.45, 0]].map((pos, i) => (
          <mesh key={`tleg-${i}`} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.9, 0.1]} />
            <meshStandardMaterial color="#8B5A2B" />
          </mesh>
        ))}
        {/* Chair */}
        <mesh position={[0, 0.5, 0.4]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.1, 0.6]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 1.0, 0.65]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.9, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {[[-0.25, 0.25, 0.15], [0.25, 0.25, 0.15], [-0.25, 0.25, 0.65], [0.25, 0.25, 0.65]].map((pos, i) => (
          <mesh key={`cleg-${i}`} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#8B5A2B" />
          </mesh>
        ))}
      </ModelWrapper>
    );
  }

  if (isMatch("chair", "chair")) {
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

  if (isMatch("table", "table")) {
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
    return <InteractiveDoor data={data} isExploreMode={isExploreMode} />;
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
    return (
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
    return (
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
    return (
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
    return (
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
    return (
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
    return (
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
    return (
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

  return wrapIfVehicle(
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

export default function WorldViewer({ params }: { params: { id: string } }) {
  const unwrappedParams = use(params as any) as { id: string };
  const id = unwrappedParams.id;

  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [drivingVehicle, setDrivingVehicle] = useState<PlacedObject | null>(null);

  usePlayerKeyboardControls();

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const res = await fetch(`/api/world/${id}`);
        if (!res.ok) throw new Error("World not found or error loading");
        const data = await res.json();
        setWorldData(data);
        setObjects(data.worldBlocks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWorld();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-sky-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
    </div>
  );

  if (error || !worldData) return (
    <div className="min-h-screen bg-sky-100 flex items-center justify-center flex-col gap-4">
      <div className="text-rose-500 font-bold text-xl">{error || "World not found"}</div>
      <a href="/" className="bg-sky-500 text-white px-4 py-2 rounded-lg font-bold">Return Home</a>
    </div>
  );

  const shopItems: any[] = worldData.builderItems || [];

  const handleEnterVehicle = (obj: PlacedObject) => {
    setDrivingVehicle(obj);
  };

  const handleExitVehicle = () => {
    if (!drivingVehicle) return;
    const newPos = playerState.pos;
    const newRot = playerState.rotation + Math.PI / 2;
    
    // Create new object list with updated vehicle
    const updatedObjects = objects.map(o => o === drivingVehicle ? { ...o, x: newPos.x, y: newPos.y, z: newPos.z, rotationY: newRot } : o);
    setObjects(updatedObjects);
    setDrivingVehicle(null);
  };

  return (
    <div className="h-screen bg-sky-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50"><Navbar /></div>


      {/* Top Right Actions */}
      <div className="absolute top-24 right-4 md:right-6 z-10 flex flex-col items-end gap-2">
        <button onClick={() => setIsExploreMode(!isExploreMode)} className={`bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg transition-colors pointer-events-auto flex items-center justify-center ${isExploreMode ? 'text-amber-600 hover:text-amber-800 border-2 border-amber-400' : 'text-slate-600 hover:text-slate-800'}`} title="Toggle Explore Mode">
          {isExploreMode ? <X className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
        </button>
        {isExploreMode && drivingVehicle && (
          <button onClick={handleExitVehicle} className="bg-rose-500 text-white p-3 rounded-full shadow-lg transition-colors pointer-events-auto flex items-center justify-center hover:bg-rose-400 border-2 border-rose-300" title="Exit Vehicle">
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mobile D-Pad (Explore Mode) */}
      {isExploreMode && <MobileDPad />}

      {/* ─── 3D Canvas ─── */}
      <main className="flex-1 w-full h-full cursor-move">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />

          {worldData.builderQuote && (
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
              {worldData.builderQuote}
            </Text>
          )}

          <CameraBounds landSize={worldData.landSize ?? 50} />
          <Ground landSize={worldData.landSize ?? 50} />
          {isExploreMode && <BakeShadows />}

          {(() => {
            const validObjects = objects;
            const opaqueBoxes = validObjects.filter(o => (!o.type || o.type === 'block' || o.type === 'large-roof') && o.color !== "#ADD8E6");
            const glassBoxes = validObjects.filter(o => (!o.type || o.type === 'block' || o.type === 'large-roof') && o.color === "#ADD8E6");
            const opaqueRoofs = validObjects.filter(o => o.type === 'roof' && o.color !== "#ADD8E6");
            const glassRoofs = validObjects.filter(o => o.type === 'roof' && o.color === "#ADD8E6");
            const items = validObjects.filter(o => o.type === 'item');

            const getBoxProps = (data: any) => {
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

            return (
              <>
                {curvenessLevels.map(level => {
                  const blocks = opaqueBoxes.filter(o => boxShapes.includes(o.blockShape) && Math.round(o.curveness || 0) === level);
                  if (blocks.length === 0) return null;
                  return (
                    <Instances key={`op-inst-${level}`} limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getCurvedGeometry(level)} attach="geometry" />
                      <meshStandardMaterial />
                      {blocks.map((data, idx) => {
                        const props = getBoxProps(data);
                        return (
                          <Instance
                            key={`ob-${level}-${idx}`}
                            position={props.position}
                            scale={props.scale}
                            rotation={props.rotation}
                            color={data.color}
                          />
                        );
                      })}
                    </Instances>
                  );
                })}

                {(() => {
                  const blocks = opaqueBoxes.filter(o => o.blockShape === 'wedge');
                  if (blocks.length === 0) return null;
                  return (
                    <Instances limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getWedgeGeometry()} attach="geometry" />
                      <meshStandardMaterial />
                      {blocks.map((data, idx) => {
                        const props = getBoxProps(data);
                        return (
                          <Instance
                            key={`ow-${idx}`}
                            position={props.position}
                            scale={props.scale}
                            rotation={props.rotation}
                            color={data.color}
                          />
                        );
                      })}
                    </Instances>
                  );
                })()}

                {(() => {
                  const blocks = opaqueBoxes.filter(o => o.blockShape === 'pyramid');
                  if (blocks.length === 0) return null;
                  return (
                    <Instances limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getPyramidGeometry()} attach="geometry" />
                      <meshStandardMaterial />
                      {blocks.map((data, idx) => {
                        const props = getBoxProps(data);
                        return (
                          <Instance
                            key={`op-${idx}`}
                            position={props.position}
                            scale={props.scale}
                            rotation={props.rotation}
                            color={data.color}
                          />
                        );
                      })}
                    </Instances>
                  );
                })()}

                {curvenessLevels.map(level => {
                  const blocks = glassBoxes.filter(o => boxShapes.includes(o.blockShape) && Math.round(o.curveness || 0) === level);
                  if (blocks.length === 0) return null;
                  return (
                    <Instances key={`gl-inst-${level}`} limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getCurvedGeometry(level)} attach="geometry" />
                      <meshStandardMaterial transparent opacity={0.6} />
                      {blocks.map((data, idx) => {
                        const props = getBoxProps(data);
                        return (
                          <Instance
                            key={`gb-${level}-${idx}`}
                            position={props.position}
                            scale={props.scale}
                            rotation={props.rotation}
                            color={data.color}
                          />
                        );
                      })}
                    </Instances>
                  );
                })}

                {(() => {
                  const blocks = glassBoxes.filter(o => o.blockShape === 'wedge');
                  if (blocks.length === 0) return null;
                  return (
                    <Instances limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getWedgeGeometry()} attach="geometry" />
                      <meshStandardMaterial transparent opacity={0.6} />
                      {blocks.map((data, idx) => {
                        const props = getBoxProps(data);
                        return (
                          <Instance
                            key={`gw-${idx}`}
                            position={props.position}
                            scale={props.scale}
                            rotation={props.rotation}
                            color={data.color}
                          />
                        );
                      })}
                    </Instances>
                  );
                })()}

                {(() => {
                  const blocks = glassBoxes.filter(o => o.blockShape === 'pyramid');
                  if (blocks.length === 0) return null;
                  return (
                    <Instances limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getPyramidGeometry()} attach="geometry" />
                      <meshStandardMaterial transparent opacity={0.6} />
                      {blocks.map((data, idx) => {
                        const props = getBoxProps(data);
                        return (
                          <Instance
                            key={`gp-${idx}`}
                            position={props.position}
                            scale={props.scale}
                            rotation={props.rotation}
                            color={data.color}
                          />
                        );
                      })}
                    </Instances>
                  );
                })()}

                {curvenessLevels.map(level => {
                  const roofs = opaqueRoofs.filter(o => Math.round(o.curveness || 0) === level);
                  if (roofs.length === 0) return null;
                  const segments = level === 0 ? 4 : level === 1 ? 8 : level === 2 ? 16 : level === 3 ? 24 : 32;
                  return (
                    <Instances key={`op-roof-inst-${level}`} limit={100000} castShadow receiveShadow frustumCulled={false}>
                      <primitive object={getRoofGeometry(segments)} attach="geometry" />
                      <meshStandardMaterial />
                      {roofs.map((data, idx) => (
                        <Instance
                          key={`or-${level}-${idx}`}
                          position={[data.x, data.y - 0.5 + (data.thickness || 1) / 2, data.z]}
                          rotation={[0, Math.PI / 4, 0]}
                          scale={[data.width || 1, data.thickness || 1, data.depth || 1]}
                          color={data.color}
                        />
                      ))}
                    </Instances>
                  );
                })}

                {curvenessLevels.map(level => {
                  const roofs = glassRoofs.filter(o => Math.round(o.curveness || 0) === level);
                  if (roofs.length === 0) return null;
                  const segments = level === 0 ? 4 : level === 1 ? 8 : level === 2 ? 16 : level === 3 ? 24 : 32;
                  return (
                    <Instances key={`gl-roof-inst-${level}`} limit={100000} castShadow receiveShadow>
                      <primitive object={getRoofGeometry(segments)} attach="geometry" />
                      <meshStandardMaterial transparent opacity={0.6} />
                      {roofs.map((data, idx) => (
                        <Instance
                          key={`gr-${level}-${idx}`}
                          position={[data.x, data.y - 0.5 + (data.thickness || 1) / 2, data.z]}
                          rotation={[0, Math.PI / 4, 0]}
                          scale={[data.width || 1, data.thickness || 1, data.depth || 1]}
                          color={data.color}
                        />
                      ))}
                    </Instances>
                  );
                })}

                {items.map((obj, idx) => {
                  const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
                  if (obj === drivingVehicle) return null;
                  return <ItemObject key={idx} data={obj} itemDef={itemDef} onEnterVehicle={() => handleEnterVehicle(obj)} isExploreMode={isExploreMode} />;
                })}
              </>
            );
          })()}

          {isExploreMode && <Player 
            objects={objects.filter(o => o !== drivingVehicle)} 
            activeAvatar={worldData.activeAvatar || 'boy'} 
            landSize={worldData.landSize ?? 50}
            drivingVehicle={drivingVehicle}
            vehicleMesh={
              drivingVehicle ? 
              <ItemObject 
                data={{ ...drivingVehicle, x: 0, y: 0.5, z: 0, rotationY: 0 }} 
                itemDef={shopItems.find((i: any) => i.id === drivingVehicle.itemId)} 
              /> : undefined
            }
          />}

          <MapControls 
            makeDefault 
            maxPolarAngle={Math.PI / 2 - 0.05} 
            enablePan={!isExploreMode} 
            rotateSpeed={0.5} 
            maxDistance={(worldData.landSize ?? 50) * 1.5}
          />
        </Canvas>
      </main>
    </div>
  );
}
