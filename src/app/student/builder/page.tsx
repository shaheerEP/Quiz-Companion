"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Canvas } from "@react-three/fiber";
import { Sky, MapControls, Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { AlertCircle, Pickaxe, Undo2, Lock, Eraser, Hammer, TreePine, PaintBucket, Triangle, Info, RotateCw, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

// Returns true if the pointer moved enough to be considered a drag
const DRAG_THRESHOLD = 10; // px

export type PlacedObject = {
  x: number; y: number; z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  rotationY?: number;
  w?: number; d?: number; h?: number;
};

type ToolMode = 'build' | 'items' | 'eraser' | 'roof' | 'paint' | 'rotate';

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

  const [toolMode, setToolMode] = useState<ToolMode>('build');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [newColorInput, setNewColorInput] = useState<string>("#ffffff");
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [selectedRoofCorners, setSelectedRoofCorners] = useState<PlacedObject[]>([]);
  const [showDirections, setShowDirections] = useState(false);

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
        if (!activeColor) {
          setActiveColor(BASE_COLORS[0].color);
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
  const shopItems: any[] = settings?.builderItems ?? [];

  const isCustomColor = studentData?.customColors?.includes(activeColor);
  const actualBlockCost = isCustomColor ? 0 : blockCost;
  const actualRoofCost = isCustomColor ? 0 : (settings?.builderRoofCost ?? 100);

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
    if (studentData?.isClassTime) return;
    if (toolMode === 'eraser' || toolMode === 'paint' || toolMode === 'roof') return;
    if (toolMode === 'build') placeBlock(x, y, z, 'block');
    if (toolMode === 'items') placeItem(x, y, z);
  };

  const paintObject = (obj: PlacedObject) => {
    if (obj.type === 'item') return;
    if (obj.color === activeColor) return;
    const newObjects = objects.map(o => (o.x === obj.x && o.y === obj.y && o.z === obj.z) ? { ...o, color: activeColor } : o);
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
      const height = 1;
      const cx = minX + (width - 1) / 2;
      const cz = minZ + (depth - 1) / 2;
      const cy = maxY + 1;

      placeLargeRoof(cx, cy, cz, width, depth, height);
      setSelectedRoofCorners([]);
    }
  };

  const handleBlockClick = (obj: PlacedObject, faceNormal?: THREE.Vector3, point?: THREE.Vector3) => {
    if (studentData?.isClassTime) return;
    if (toolMode === 'eraser') { eraseObject(obj); return; }
    if (toolMode === 'paint') { paintObject(obj); return; }
    if (toolMode === 'roof') { handleRoofSelection(obj); return; }
    if (toolMode === 'rotate') { rotateObject(obj); return; }
    
    if (!faceNormal) return;
    
    // For large flat roofs, calculate adjacent block center accurately using point and normal
    let nx = obj.x + faceNormal.x;
    let ny = obj.y + faceNormal.y;
    let nz = obj.z + faceNormal.z;
    
    if (obj.type === 'large-roof' && point && faceNormal) {
      nx = Math.round(point.x + faceNormal.x * 0.5);
      ny = Math.round(point.y + faceNormal.y * 0.5);
      nz = Math.round(point.z + faceNormal.z * 0.5);
    }

    if (toolMode === 'build') placeBlock(nx, ny, nz, 'block');
    if (toolMode === 'items') placeItem(nx, ny, nz);
  };

  const handleItemClick = (obj: PlacedObject) => {
    if (studentData?.isClassTime) return;
    if (toolMode === 'eraser') { eraseObject(obj); return; }
    if (toolMode === 'paint') return; // Cannot paint items
    if (toolMode === 'roof') return; // Cannot use items as roof corners
    if (toolMode === 'rotate') { rotateObject(obj); return; }
    if (toolMode === 'build') placeBlock(obj.x + 1, 0, obj.z, 'block');
    if (toolMode === 'items') placeItem(obj.x + 1, 0, obj.z);
  };

  /* ─── Place Block ─── */

  const placeLargeRoof = (x: number, y: number, z: number, w: number, d: number, h: number) => {
    if (!studentData) return;
    const cost = actualRoofCost;
    if (studentData.pointsBalance < cost) { showMessage(`Need ${cost} pts!`, "error"); return; }

    const obj: PlacedObject = { x, y, z, color: activeColor, type: 'large-roof', w, d, h };
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
    if (objects.some(o => o.x === x && o.y === y && o.z === z)) return;
    if (studentData.pointsBalance < actualBlockCost) { showMessage(`Need ${actualBlockCost} pts!`, "error"); return; }

    const obj: PlacedObject = { x, y, z, color: activeColor, type };
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

      {studentData?.isClassTime && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-rose-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg font-black tracking-widest uppercase border border-rose-400">
          Class Time Active - Explore Mode
        </div>
      )}

      {/* ─── Left Panel: Points, Tools, Undo ─── */}
      {!studentData?.isClassTime && (
        <div className="absolute top-24 left-4 md:left-6 z-10 flex flex-col gap-3 pointer-events-none max-h-[calc(100vh-7rem)] overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden">
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
          <button onClick={() => { setToolMode('roof'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'roof' ? 'bg-sky-600 text-white' : 'text-sky-700 hover:bg-sky-50'}`}>
            <Triangle className="w-4 h-4" /> Roof
          </button>
          <button onClick={() => setToolMode('items')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'items' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}>
            <TreePine className="w-4 h-4" /> Items
          </button>
          <button onClick={() => { setToolMode('paint'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'paint' ? 'bg-indigo-500 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}>
            <PaintBucket className="w-4 h-4" /> Paint
          </button>
          <button onClick={() => { setToolMode('eraser'); setActiveItemId(null); }}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 ${toolMode === 'eraser' ? 'bg-rose-500 text-white' : 'text-rose-600 hover:bg-rose-50'}`}>
            <Eraser className="w-5 h-5" /> Erase
          </button>
          <button onClick={() => setToolMode('rotate')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-t border-sky-100 rounded-b-2xl ${toolMode === 'rotate' ? 'bg-purple-500 text-white' : 'text-purple-600 hover:bg-purple-50'}`}>
            <RotateCw className="w-5 h-5" /> Rotate
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
      )}

      {/* ─── Bottom Bar: Color Palette / Item Palette ─── */}
      {!studentData?.isClassTime && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] md:w-auto max-w-3xl z-10 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white flex flex-wrap justify-center items-center gap-3 pointer-events-auto">
        
        {(toolMode === 'build' || toolMode === 'roof' || toolMode === 'paint') && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-sky-200">
              <Pickaxe className="w-4 h-4 text-sky-600" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">{toolMode === 'paint' ? 'Color' : toolMode === 'roof' ? 'Roof' : 'Block'}</span>
                <span className="text-xs font-black text-amber-500">{toolMode === 'paint' || isCustomColor ? 'Free' : `-${toolMode === 'roof' ? actualRoofCost : actualBlockCost} pts`}</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1 items-center">
              {BASE_COLORS.map((b) => (
                <button key={b.id}
                  onClick={() => setActiveColor(b.color)}
                  className={`relative shrink-0 w-10 h-10 rounded-xl border-[3px] transition-transform hover:scale-110 shadow-sm overflow-hidden ${activeColor === b.color ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: b.color }} title={b.name}
                />
              ))}
              
              {studentData?.customColors?.map((color: string, idx: number) => (
                <button key={`custom-${idx}`}
                  onClick={() => setActiveColor(color)}
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

      {/* ─── 3D Canvas ─── */}
      <main className={`flex-1 w-full h-full ${cursorClass}`}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
          draggedRef.current = false;
        }}
        onPointerMove={(e) => {
          if (!pointerDownPos.current) return;
          const dx = e.clientX - pointerDownPos.current.x;
          const dy = e.clientY - pointerDownPos.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            draggedRef.current = true;
          }
        }}
      >
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
          
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

          <Ground onClick={handleGroundClick} isDragging={isDraggingFn} />
          
          {objects.map((obj, idx) => {
            if (obj.type === 'item') {
              const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
              return <ItemObject key={idx} data={obj} itemDef={itemDef} onClick={handleItemClick} isDragging={isDraggingFn} />;
            }
            if (obj.type === 'roof') {
              return <RoofBlock key={idx} data={obj} onClick={handleBlockClick} isDragging={isDraggingFn} />;
            }
            if (obj.type === 'large-roof') {
              return <LargeRoofBlock key={idx} data={obj} onClick={handleBlockClick} isDragging={isDraggingFn} />;
            }
            return <Block key={idx} data={obj} onClick={handleBlockClick} isDragging={isDraggingFn} />;
          })}

          {selectedRoofCorners.map((corner, idx) => (
            <mesh key={`corner-${idx}`} position={[corner.x, corner.y, corner.z]}>
              <boxGeometry args={[1.1, 1.1, 1.1]} />
              <meshBasicMaterial color="#ef4444" wireframe />
            </mesh>
          ))}

          <MapControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  );
}
