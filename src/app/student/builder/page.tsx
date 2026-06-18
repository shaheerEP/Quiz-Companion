"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, MapControls, Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { AlertCircle, Pickaxe, Undo2, Lock, Eraser, Hammer, TreePine, PaintBucket, Triangle, Info, RotateCw, Share2, Gamepad2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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

/* ─── Explore Mode Logic ─── */

const controlsRef = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

function Player({ objects }: { objects: PlacedObject[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const targetRotation = useRef(0);
  const speed = 6;
  const walkTime = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let dirX = 0;
    let dirZ = 0;
    if (controlsRef.forward) dirZ -= 1;
    if (controlsRef.backward) dirZ += 1;
    if (controlsRef.left) dirX -= 1;
    if (controlsRef.right) dirX += 1;

    const moving = dirX !== 0 || dirZ !== 0;

    if (moving) {
      const inputAngle = Math.atan2(dirX, dirZ);
      
      const camVec = new THREE.Vector3();
      state.camera.getWorldDirection(camVec);
      const camAngle = Math.atan2(-camVec.x, -camVec.z);

      targetRotation.current = camAngle + inputAngle;
      
      velocity.current.x = Math.sin(targetRotation.current) * speed;
      velocity.current.z = Math.cos(targetRotation.current) * speed;
      
      walkTime.current += delta * 15;
    } else {
      velocity.current.set(0, 0, 0);
      walkTime.current = 0;
    }

    pos.current.x += velocity.current.x * delta;
    pos.current.z += velocity.current.z * delta;

    const rx = Math.round(pos.current.x);
    const rz = Math.round(pos.current.z);
    
    let highestY = 0;
    objects.forEach(o => {
      if (o.type === 'item') return;
      const hw = (o.w || 1) / 2;
      const hd = (o.d || 1) / 2;
      if (rx >= o.x - hw && rx <= o.x + hw && rz >= o.z - hd && rz <= o.z + hd) {
        const topY = o.y + (o.h || 1);
        if (topY > highestY) highestY = topY;
      }
    });

    pos.current.y = THREE.MathUtils.lerp(pos.current.y, highestY, delta * 10);

    const diff = ((targetRotation.current - groupRef.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    const wrappedDiff = diff < -Math.PI ? diff + Math.PI * 2 : diff;
    groupRef.current.rotation.y += wrappedDiff * delta * 10;

    groupRef.current.position.copy(pos.current);

    if (leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current) {
      const swing = Math.sin(walkTime.current) * 0.5;
      leftLegRef.current.rotation.x = swing;
      rightLegRef.current.rotation.x = -swing;
      leftArmRef.current.rotation.x = -swing;
      rightArmRef.current.rotation.x = swing;
    }

    if (state.controls) {
      const controls = state.controls as any;
      const deltaPos = new THREE.Vector3().subVectors(pos.current, controls.target);
      controls.target.copy(pos.current);
      state.camera.position.add(deltaPos);
    }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, 1.4, 0]}>
        {/* Head Base */}
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.55, 0.15, 0.55]} />
          <meshStandardMaterial color="#3e2723" />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.1, 0.05, 0.26]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.05]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.1, 0.05, 0.26]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.05]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </group>
      {/* Body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.3]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.4, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
      </group>
      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.4, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
      </group>
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.15, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.25, 0.5, 0.25]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
      </group>
      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.15, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.25, 0.5, 0.25]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
      </group>
    </group>
  );
}

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

  if (isMatch("stool", "stool", "🪑")) {
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
  const [showVehiclesDropdown, setShowVehiclesDropdown] = useState(false);
  const [showAnimalsDropdown, setShowAnimalsDropdown] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(false);

  /* ─── Keyboard Listeners ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': controlsRef.forward = true; break;
        case 'ArrowDown': case 'KeyS': controlsRef.backward = true; break;
        case 'ArrowLeft': case 'KeyA': controlsRef.left = true; break;
        case 'ArrowRight': case 'KeyD': controlsRef.right = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': controlsRef.forward = false; break;
        case 'ArrowDown': case 'KeyS': controlsRef.backward = false; break;
        case 'ArrowLeft': case 'KeyA': controlsRef.left = false; break;
        case 'ArrowRight': case 'KeyD': controlsRef.right = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
    if (studentData?.isClassTime || isExploreMode) return;
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
    if (studentData?.isClassTime || isExploreMode) return;
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
    if (studentData?.isClassTime || isExploreMode) return;
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
    const overlaps = objects.filter(o => o.x === x && o.y === y && o.z === z);
    if (overlaps.length > 0 && !overlaps.every(o => o.itemId === 'grass_field')) return;
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

      {studentData?.isClassTime && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-rose-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg font-black tracking-widest uppercase border border-rose-400">
          Class Time Active - Explore Mode
        </div>
      )}

      {/* ─── Left Panel: Points, Tools, Undo ─── */}
      {(!studentData?.isClassTime && !isExploreMode) && (
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
      {(!studentData?.isClassTime && !isExploreMode) && (
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
          <div className="flex flex-wrap justify-center gap-2 pb-1 px-1 relative items-center w-full">
            {shopItems.filter((i: any) => !['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep', 'cat', 'horse', 'cow', 'goat', 'pig', 'dog', 'chicken'].includes(i.id)).map((item: any) => (
              <button key={item.id}
                onClick={() => setActiveItemId(item.id)}
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
                              onClick={() => { setActiveItemId(item.id); setShowVehiclesDropdown(false); }}
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
                              onClick={() => { setActiveItemId(item.id); setShowAnimalsDropdown(false); }}
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
          <button onClick={() => setIsExploreMode(!isExploreMode)} className={`bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg transition-colors pointer-events-auto flex items-center justify-center ${isExploreMode ? 'text-amber-600 hover:text-amber-800 border-2 border-amber-400' : 'text-slate-600 hover:text-slate-800'}`} title="Toggle Explore Mode">
            {isExploreMode ? <X className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
          </button>
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

      {/* ─── Mobile D-Pad (Explore Mode) ─── */}
      {isExploreMode && (
        <div className="absolute bottom-8 right-8 z-30 flex flex-col items-center gap-2 pointer-events-auto select-none sm:hidden">
          <button 
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); controlsRef.forward = true; }}
            onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); controlsRef.forward = false; }}
            className="w-14 h-14 bg-white/60 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center active:bg-sky-500/80 active:text-white text-sky-800 transition-colors">
            <ChevronUp className="w-8 h-8" />
          </button>
          <div className="flex gap-14">
            <button 
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); controlsRef.left = true; }}
              onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); controlsRef.left = false; }}
              className="w-14 h-14 bg-white/60 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center active:bg-sky-500/80 active:text-white text-sky-800 transition-colors">
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button 
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); controlsRef.right = true; }}
              onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); controlsRef.right = false; }}
              className="w-14 h-14 bg-white/60 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center active:bg-sky-500/80 active:text-white text-sky-800 transition-colors">
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
          <button 
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); controlsRef.backward = true; }}
            onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); controlsRef.backward = false; }}
            className="w-14 h-14 bg-white/60 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center active:bg-sky-500/80 active:text-white text-sky-800 transition-colors">
            <ChevronDown className="w-8 h-8" />
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

          {isExploreMode && <Player objects={objects} />}
          <MapControls 
            makeDefault 
            maxPolarAngle={Math.PI / 2 - 0.05} 
            enablePan={!isExploreMode} 
          />
        </Canvas>
      </main>
    </div>
  );
}
