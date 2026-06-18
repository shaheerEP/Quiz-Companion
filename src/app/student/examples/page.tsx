"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Canvas } from "@react-three/fiber";
import { Sky, MapControls, Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { AlertCircle, Pickaxe, Undo2, Lock, Eraser, Hammer, TreePine, PaintBucket, Triangle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Returns true if the pointer moved enough to be considered a drag
const DRAG_THRESHOLD = 5; // px

type PlacedObject = {
  x: number; y: number; z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  w?: number; d?: number; h?: number;
  rotationY?: number;
};

type ToolMode = 'build' | 'items' | 'eraser' | 'roof' | 'paint';

const BASE_COLORS = [
  { id: "wood", color: "#8B5A2B", name: "Wood" },
  { id: "stone", color: "#808080", name: "Stone" },
  { id: "brick", color: "#B22222", name: "Brick" },
  { id: "glass", color: "#ADD8E6", name: "Glass" },
];

/* ─── 3D Components ─── */

function Ground({ onClick, isDragging }: { onClick: (x: number, y: number, z: number) => void, isDragging: () => boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow
      onClick={(e) => { if (isDragging()) return; e.stopPropagation(); const p = e.point; onClick(Math.round(p.x), 0, Math.round(p.z)); }}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#4ade80" />
      <gridHelper args={[100, 100, "#22c55e", "#22c55e"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
}

function Block({ data, onClick, isDragging }: { data: PlacedObject, onClick: (obj: PlacedObject, faceNormal?: THREE.Vector3) => void, isDragging: () => boolean }) {
  return (
    <mesh position={[data.x, data.y, data.z]} castShadow receiveShadow
      onClick={(e) => { if (isDragging()) return; e.stopPropagation(); onClick(data, e.face?.normal); }}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={data.color} transparent={data.color === "#ADD8E6"} opacity={data.color === "#ADD8E6" ? 0.6 : 1} />
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

function ItemObject({ data, itemDef, onClick, isDragging }: { data: PlacedObject, itemDef: any, onClick: (obj: PlacedObject) => void, isDragging: () => boolean }) {
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
  const isMatch = (idStr: string, nameStr: string, emojiStr: string) => itemId === idStr || name.includes(nameStr) || emoji === emojiStr;

  if (isMatch("cat", "cat", "🐈")) return renderAnimal("#f59e0b", [0.3, 0.3, 0.6], "#f59e0b", [0.25, 0.25, 0.25], [0, 0.45, 0.42], "#d97706", [0.08, 0.2, 0.08]);
  if (isMatch("horse", "horse", "🐎")) return renderAnimal("#8B4513", [0.8, 0.8, 1.6], "#8B4513", [0.4, 0.5, 0.6], [0, 1.8, 0.9], "#5C4033", [0.2, 1.0, 0.2]);
  if (isMatch("cow", "cow", "🐄")) return renderAnimal("#f3f4f6", [1.0, 0.8, 1.6], "#1f2937", [0.5, 0.5, 0.6], [0, 1.4, 0.9], "#1f2937", [0.2, 0.8, 0.2], true);
  if (isMatch("goat", "goat", "🐐")) return renderAnimal("#e5e7eb", [0.6, 0.6, 1.0], "#d1d5db", [0.3, 0.3, 0.4], [0, 1.0, 0.6], "#9ca3af", [0.15, 0.6, 0.15], true, "#4b5563");
  if (isMatch("pig", "pig", "🐖")) return renderAnimal("#fbcfe8", [0.8, 0.7, 1.2], "#fbcfe8", [0.5, 0.5, 0.5], [0, 0.7, 0.7], "#f9a8d4", [0.2, 0.4, 0.2]);
  if (isMatch("dog", "dog", "🐕")) return renderAnimal("#a16207", [0.4, 0.4, 0.8], "#a16207", [0.3, 0.3, 0.4], [0, 0.6, 0.5], "#854d0e", [0.1, 0.4, 0.1]);

  if (isMatch("chicken", "chicken", "🐓")) {
    return (
      <ModelWrapper>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.4]} />
          <meshStandardMaterial color="#fef2f2" />
        </mesh>
        <mesh position={[0, 0.5, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.2, 0.15]} />
          <meshStandardMaterial color="#fef2f2" />
        </mesh>
        <mesh position={[0, 0.65, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.1, 0.1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {[[-0.1, 0.1, 0], [0.1, 0.1, 0]].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 4]} />
            <meshStandardMaterial color="#fbbf24" />
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
    return (
      <ModelWrapper>
        {/* Door Frame */}
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 1.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        {/* Door Knob */}
        <mesh position={[0.3, 0.9, 0.08]} castShadow receiveShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      </ModelWrapper>
    );
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

  if (isMatch("tree", "tree", "🌲")) {
    return (
      <ModelWrapper>
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
        {/* Rear Bumper */}
        <mesh position={[1.35, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.15, 1.4]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
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

import { EXAMPLE_WORLDS } from "./worlds";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ExampleWorldsViewer() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorldId, setActiveWorldId] = useState(EXAMPLE_WORLDS[0].id);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  if (!user || user.role !== 'student') return null;
  if (loading) return (
    <div className="min-h-screen bg-sky-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
    </div>
  );

  const activeWorld = EXAMPLE_WORLDS.find(w => w.id === activeWorldId) || EXAMPLE_WORLDS[0];
  const shopItems: any[] = settings?.builderItems || [];

  return (
    <div className="h-screen bg-sky-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50"><Navbar /></div>

      {/* Navigation & Selector */}
      <div className="absolute top-24 left-6 z-10 flex flex-col gap-4 pointer-events-none">
        <Link href="/student/builder" className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white pointer-events-auto flex items-center gap-2 text-sky-700 font-bold hover:bg-white transition-colors w-fit">
          <ArrowLeft className="w-5 h-5" /> Back to My World
        </Link>
        
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white pointer-events-auto flex flex-col gap-3">
          <h2 className="text-sky-800 font-black text-lg uppercase tracking-wider mb-1">Example Worlds</h2>
          {EXAMPLE_WORLDS.map(world => (
            <button key={world.id}
              onClick={() => setActiveWorldId(world.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeWorldId === world.id ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-100'}`}
            >
              <span className="text-xl">{world.emoji}</span>
              {world.name}
            </button>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white pointer-events-auto max-w-xs">
          <p className="text-sm font-bold text-sky-800">
            Explore these worlds to see what you can build! <br/><br/>
            🖱️ Left Click + Drag to pan<br/>
            🖱️ Right Click + Drag to rotate<br/>
            🖱️ Scroll to zoom
          </p>
        </div>
      </div>

      {/* 3D Canvas */}
      <main className="flex-1 w-full h-full cursor-move">
        <Canvas shadows camera={{ position: [8, 8, 8], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
          
          <Ground onClick={() => {}} isDragging={() => false} />
          
          {activeWorld.objects.map((obj, idx) => {
            if (obj.type === 'item') {
              const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
              return <ItemObject key={idx} data={obj} itemDef={itemDef} onClick={() => {}} isDragging={() => false} />;
            }
            if (obj.type === 'roof') {
              return <RoofBlock key={idx} data={obj} onClick={() => {}} isDragging={() => false} />;
            }
            if (obj.type === 'large-roof') {
              return <LargeRoofBlock key={idx} data={obj} onClick={() => {}} isDragging={() => false} />;
            }
            return <Block key={idx} data={obj} onClick={() => {}} isDragging={() => false} />;
          })}

          <MapControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  );
}
