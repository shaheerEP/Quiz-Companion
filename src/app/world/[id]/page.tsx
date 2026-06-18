"use client";

import { useEffect, useState, use } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, MapControls, Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";

export type PlacedObject = {
  x: number; y: number; z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  rotationY?: number;
  w?: number; d?: number; h?: number;
};

/* ─── 3D Components (Read-Only) ─── */

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#4ade80" />
      <gridHelper args={[100, 100, "#22c55e", "#22c55e"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
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

function ItemObject({ data, itemDef }: { data: PlacedObject, itemDef: any }) {
  const w = itemDef?.width ?? 1;
  const h = itemDef?.height ?? 1;
  const d = itemDef?.depth ?? 1;
  const yPos = data.y + (h / 2) - 0.5;

  const itemId = data.itemId || "";

  const ModelWrapper = ({ children }: { children: React.ReactNode }) => (
    <group position={[data.x, data.y - 0.5, data.z]} rotation={[0, data.rotationY || 0, 0]}>
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
        <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
          <boxGeometry args={bodyArgs} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={headPos} castShadow receiveShadow>
          <boxGeometry args={headArgs} />
          <meshStandardMaterial color={headColor} />
        </mesh>
        {[[-legX, lh/2, legZ], [legX, lh/2, legZ], [-legX, lh/2, -legZ], [legX, lh/2, -legZ]].map((pos, i) => (
          <mesh key={i} position={pos as [number,number,number]} castShadow receiveShadow>
            <boxGeometry args={legArgs} />
            <meshStandardMaterial color={legColor} />
          </mesh>
        ))}
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
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 1.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
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
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.8, 0.1]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.7, 0.12]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.4, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.8, 0.15]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
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
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
          <meshStandardMaterial color="#5C4033" />
        </mesh>
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
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
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
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.4, 0.8]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[-0.1, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.4, 0.7]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
        </mesh>
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
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.1, 2, 8]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
        <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
        </mesh>
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
        <mesh position={[-0.6, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0.6, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
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
        <mesh position={[0, 0.4, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
        <mesh position={[0, 0.4, 0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
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

  const boxColor = "#9ca3af";

  return (
    <group position={[data.x, yPos, data.z]} rotation={[0, data.rotationY || 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
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

export default function WorldViewer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const res = await fetch(`/api/world/${id}`);
        if (!res.ok) throw new Error("World not found or error loading");
        const data = await res.json();
        setWorldData(data);
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

  const objects: PlacedObject[] = worldData.worldBlocks;
  const shopItems: any[] = worldData.builderItems || [];

  return (
    <div className="h-screen bg-sky-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50"><Navbar /></div>

      {/* ─── Top Left: Creator Info ─── */}
      <div className="absolute top-24 left-4 md:left-6 z-10 flex flex-col gap-3 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white">
          <h1 className="text-2xl font-black text-sky-800 tracking-tight">
            {worldData.name}&apos;s World
          </h1>
          <p className="text-sm text-sky-600 font-bold mt-1">Explore this built world!</p>
          
          <button 
            onClick={handleCopyLink}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl font-bold transition-colors text-sm bg-sky-50 text-sky-700 hover:bg-sky-100"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied Link!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* ─── Bottom Right: Instructions ─── */}
      <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white text-sm font-bold text-sky-800 max-w-[220px]">
          <p className="mb-2">🖱️ Left Click + Drag to pan</p>
          <p className="mb-2">🖱️ Right Click + Drag to rotate</p>
          <p>🖱️ Scroll to zoom</p>
        </div>
      </div>

      {/* ─── 3D Canvas ─── */}
      <main className="flex-1 w-full h-full cursor-move">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
          
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

          <Ground />
          
          {objects.map((obj, idx) => {
            if (obj.type === 'item') {
              const itemDef = shopItems.find((i: any) => i.id === obj.itemId);
              return <ItemObject key={idx} data={obj} itemDef={itemDef} />;
            }
            if (obj.type === 'roof') {
              return <RoofBlock key={idx} data={obj} />;
            }
            if (obj.type === 'large-roof') {
              return <LargeRoofBlock key={idx} data={obj} />;
            }
            return <Block key={idx} data={obj} />;
          })}

          <MapControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  );
}
