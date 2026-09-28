"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HelicopterModelProps {
  color?: string;
  isSpinning?: boolean;
}

export function HelicopterModel({ color = "#0284c7", isSpinning = true }: HelicopterModelProps) {
  const mainRotorRef = useRef<THREE.Group>(null);
  const tailRotorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const spinFactor = Math.min(delta, 0.1);
    const speed = isSpinning ? 36 : 6;
    if (mainRotorRef.current) {
      mainRotorRef.current.rotation.y += spinFactor * speed;
    }
    if (tailRotorRef.current) {
      tailRotorRef.current.rotation.z += spinFactor * (speed * 1.5);
    }
  });

  return (
    <group>
      {/* ─── Main Fuselage / Cabin ─── */}
      {/* Core cabin body */}
      <mesh position={[-0.1, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.9, 1.1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Aerodynamic Cockpit Nose */}
      <mesh position={[-1.15, 0.6, 0]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.7, 1.05]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Cockpit Windshield (Glossy Tinted Glass) */}
      <mesh position={[-1.18, 0.72, 0]} rotation={[0, 0, 0.28]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 0.5, 0.98]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Cockpit Top Glass */}
      <mesh position={[-0.6, 1.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.05, 0.85]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Side Windows */}
      <mesh position={[-0.1, 0.82, 0.56]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.45, 0.04]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[-0.1, 0.82, -0.56]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.45, 0.04]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Nose Searchlight / Spotlight */}
      <group position={[-1.52, 0.45, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.1, 0.14, 0.12, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* Turbine Engine Top Fairing & Exhausts */}
      <mesh position={[0.2, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.3, 0.7]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </mesh>
      <mesh position={[0.7, 1.22, 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.25, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0.7, 1.22, -0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.25, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* ─── Tail Boom & Stabilizers ─── */}
      {/* Tapered tail boom */}
      <mesh position={[1.7, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.22, 0.22]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>

      {/* Horizontal Stabilizer Wings */}
      <mesh position={[2.3, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.04, 0.95]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Vertical Tail Fin */}
      <mesh position={[2.65, 1.15, 0]} rotation={[0, 0, -0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 0.85, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[2.72, 1.55, 0]} castShadow>
        <boxGeometry args={[0.15, 0.06, 0.07]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>

      {/* ─── Landing Skids ─── */}
      {/* Left Skid Rail */}
      <mesh position={[-0.1, 0.06, 0.55]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.06, 0.06]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Left Skid Curved Nose */}
      <mesh position={[-1.38, 0.16, 0.55]} rotation={[0, 0, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.06, 0.06]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Right Skid Rail */}
      <mesh position={[-0.1, 0.06, -0.55]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.06, 0.06]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Right Skid Curved Nose */}
      <mesh position={[-1.38, 0.16, -0.55]} rotation={[0, 0, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.06, 0.06]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Skid Struts (Connecting cabin to skids) */}
      {[
        [-0.6, 0.22, 0.5], [0.4, 0.22, 0.5],
        [-0.6, 0.22, -0.5], [0.4, 0.22, -0.5]
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, pos[0] < 0 ? 0.2 : -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
        </mesh>
      ))}

      {/* ─── Main Rotor Assembly ─── */}
      <mesh position={[-0.1, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.25, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Rotating Main Blades */}
      <group ref={mainRotorRef} position={[-0.1, 1.54, 0]}>
        {/* Rotor Hub */}
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.7} />
        </mesh>
        {/* Blade 1 & 2 (X axis) */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <boxGeometry args={[3.8, 0.02, 0.18]} />
          <meshStandardMaterial color="#111827" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Warning Tips for Blade 1 & 2 */}
        <mesh position={[1.8, 0.031, 0]}>
          <boxGeometry args={[0.22, 0.022, 0.182]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[-1.8, 0.031, 0]}>
          <boxGeometry args={[0.22, 0.022, 0.182]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>

        {/* Blade 3 & 4 (Z axis) */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <boxGeometry args={[0.18, 0.02, 3.8]} />
          <meshStandardMaterial color="#111827" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Warning Tips for Blade 3 & 4 */}
        <mesh position={[0, 0.031, 1.8]}>
          <boxGeometry args={[0.182, 0.022, 0.22]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.031, -1.8]}>
          <boxGeometry args={[0.182, 0.022, 0.22]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* ─── Tail Rotor Assembly ─── */}
      <group position={[2.7, 1.25, 0.07]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <group ref={tailRotorRef}>
          <mesh position={[0, 0, 0.04]} castShadow>
            <boxGeometry args={[0.07, 0.8, 0.015]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0, 0.04]} castShadow>
            <boxGeometry args={[0.8, 0.07, 0.015]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
