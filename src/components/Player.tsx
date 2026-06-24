"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const controlsRef = { forward: false, backward: false, left: false, right: false };

export function usePlayerKeyboardControls() {
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
}

export function MobileDPad() {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const maxDistance = 35; // Max pixels the knob can move from center

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystick(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateJoystick(e);
  };

  const updateJoystick = (e: React.PointerEvent) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    setKnobPos({ x: dx, y: dy });

    const threshold = 15;
    controlsRef.forward = dy < -threshold;
    controlsRef.backward = dy > threshold;
    controlsRef.left = dx < -threshold;
    controlsRef.right = dx > threshold;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setKnobPos({ x: 0, y: 0 });
    controlsRef.forward = false;
    controlsRef.backward = false;
    controlsRef.left = false;
    controlsRef.right = false;
  };

  return (
    <div className="absolute bottom-8 right-8 pointer-events-auto select-none" style={{ zIndex: 50 }}>
      <div
        ref={baseRef}
        className="w-32 h-32 bg-white/20 backdrop-blur-md border-2 border-white/40 rounded-full flex items-center justify-center touch-none shadow-xl relative cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="w-12 h-12 bg-white/90 rounded-full shadow-lg border border-slate-200 absolute transition-none pointer-events-none"
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
        >
          <div className="absolute inset-2 rounded-full border-2 border-slate-300 opacity-50" />
        </div>
      </div>
    </div>
  );
}

export const playerState = { pos: new THREE.Vector3(), rotation: 0 };

export function Player({ objects, activeAvatar = 'boy', drivingVehicle, vehicleMesh, landSize = 50 }: { objects: any[], activeAvatar?: string, drivingVehicle?: any | null, vehicleMesh?: React.ReactNode, landSize?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const targetRotation = useRef(0);
  const speed = drivingVehicle ? 5.5 : 3;
  const walkTime = useRef(0);
  const logicalY = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (drivingVehicle) {
      pos.current.set(drivingVehicle.x, drivingVehicle.y, drivingVehicle.z);
      const vehicleRot = (drivingVehicle.rotationY || 0) - Math.PI / 2;
      if (groupRef.current) {
        groupRef.current.position.copy(pos.current);
        groupRef.current.rotation.y = vehicleRot;
      }
      targetRotation.current = vehicleRot;
      playerState.rotation = vehicleRot;
      logicalY.current = drivingVehicle.y;
    }
  }, [drivingVehicle]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!initialized.current) {
      let startY = 0;
      objects.forEach(o => {

        const hw = (o.w || o.width || 1) / 2;
        const hd = (o.d || o.depth || 1) / 2;
        if (pos.current.x >= o.x - hw && pos.current.x <= o.x + hw &&
          pos.current.z >= o.z - hd && pos.current.z <= o.z + hd) {
          const topY = o.y + (o.h || o.thickness || 1);
          if (topY > startY) startY = topY;
        }
      });
      logicalY.current = startY;
      pos.current.y = startY;
      initialized.current = true;
    }

    let dirX = 0;
    let dirZ = 0;
    if (controlsRef.forward) dirZ -= 1;
    if (controlsRef.backward) dirZ += 1;
    if (controlsRef.left) dirX -= 1;
    if (controlsRef.right) dirX += 1;

    let moving = false;

    if (drivingVehicle) {
      let moveSpeed = 0;
      if (controlsRef.forward) moveSpeed = speed;
      else if (controlsRef.backward) moveSpeed = -speed;

      if (moveSpeed !== 0) {
        moving = true;
        let turnAmount = 0;
        // The virtual joystick allows left/right simultaneously with forward/backward
        if (controlsRef.left) turnAmount = 0.5;
        if (controlsRef.right) turnAmount = -0.5;

        // When reversing, turning left makes the front go right
        groupRef.current.rotation.y += turnAmount * delta * Math.sign(moveSpeed);
      }

      velocity.current.x = Math.sin(groupRef.current.rotation.y) * moveSpeed;
      velocity.current.z = Math.cos(groupRef.current.rotation.y) * moveSpeed;
      targetRotation.current = groupRef.current.rotation.y;
    } else {
      if (dirX !== 0 || dirZ !== 0) {
        moving = true;
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

      const diff = ((targetRotation.current - groupRef.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      const wrappedDiff = diff < -Math.PI ? diff + Math.PI * 2 : diff;
      groupRef.current.rotation.y += wrappedDiff * delta * 3;
    }

    const checkCollision = (x: number, z: number, currentY: number) => {
      const r = 0.25;
      const stepHeight = 1.1;
      const playerHeight = 1.5;
      let floorY = 0;
      let wallHit = false;

      objects.forEach(o => {

        const hw = (o.w || o.width || 1) / 2;
        const hd = (o.d || o.depth || 1) / 2;
        const blockMinX = o.x - hw;
        const blockMaxX = o.x + hw;
        const blockMinZ = o.z - hd;
        const blockMaxZ = o.z + hd;

        const playerMinX = x - r;
        const playerMaxX = x + r;
        const playerMinZ = z - r;
        const playerMaxZ = z + r;

        if (playerMaxX > blockMinX && playerMinX < blockMaxX &&
          playerMaxZ > blockMinZ && playerMinZ < blockMaxZ) {
          const topY = o.y + (o.h || o.thickness || 1);
          const bottomY = o.y;

          if (topY <= currentY + stepHeight) {
            if (topY > floorY) floorY = topY;
          } else if (bottomY < currentY + playerHeight) {
            wallHit = true;
          }
        }
      });
      return { floorY, wallHit };
    };

    const currentY = logicalY.current;
    let targetX = pos.current.x + velocity.current.x * delta;
    let targetZ = pos.current.z + velocity.current.z * delta;

    let { wallHit: wallHitX } = checkCollision(targetX, pos.current.z, currentY);
    if (wallHitX) targetX = pos.current.x;

    let { wallHit: wallHitZ } = checkCollision(pos.current.x, targetZ, currentY);
    if (wallHitZ) targetZ = pos.current.z;

    let { floorY: finalFloorY, wallHit: finalWallHit } = checkCollision(targetX, targetZ, currentY);
    if (finalWallHit) {
      let { wallHit: slideX, floorY: floorX } = checkCollision(targetX, pos.current.z, currentY);
      let { wallHit: slideZ, floorY: floorZ } = checkCollision(pos.current.x, targetZ, currentY);
      if (!slideX) {
        targetZ = pos.current.z;
        finalFloorY = floorX;
      } else if (!slideZ) {
        targetX = pos.current.x;
        finalFloorY = floorZ;
      } else {
        targetX = pos.current.x;
        targetZ = pos.current.z;
        finalFloorY = currentY;
      }
    }

    const halfLand = landSize / 2;
    if (targetX < -halfLand || targetX > halfLand) targetX = pos.current.x;
    if (targetZ < -halfLand || targetZ > halfLand) targetZ = pos.current.z;

    pos.current.x = targetX;
    pos.current.z = targetZ;
    logicalY.current = finalFloorY;

    playerState.pos.copy(pos.current);
    playerState.rotation = targetRotation.current;

    pos.current.y = THREE.MathUtils.lerp(pos.current.y, finalFloorY, delta * 15);

    groupRef.current.position.copy(pos.current);

    if (leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current) {
      const swing = Math.sin(walkTime.current) * 0.5;
      leftLegRef.current.rotation.x = swing;
      rightLegRef.current.rotation.x = -swing;
      leftArmRef.current.rotation.x = -swing;
      rightArmRef.current.rotation.x = swing;
    }

    // Chase Camera Logic
    const targetLookAt = new THREE.Vector3(pos.current.x, pos.current.y + 1, pos.current.z);

    if (moving) {
      if (state.controls) {
        const controls = state.controls as any;
        controls.enabled = false;
      }

      const distance = drivingVehicle ? 6 : 2.5;
      const height = drivingVehicle ? 3 : 1.5;
      const angle = groupRef.current.rotation.y;

      const offsetX = -Math.sin(angle) * distance;
      const offsetZ = -Math.cos(angle) * distance;

      const idealCamPos = new THREE.Vector3(
        pos.current.x + offsetX,
        pos.current.y + height,
        pos.current.z + offsetZ
      );

      state.camera.position.lerp(idealCamPos, delta * 1.5);
      state.camera.lookAt(targetLookAt);

      if (state.controls) {
        const controls = state.controls as any;
        controls.target.copy(targetLookAt);
      }
    } else {
      if (state.controls) {
        const controls = state.controls as any;
        controls.enabled = true;
        controls.target.lerp(targetLookAt, delta * 10);
        controls.update();
      } else {
        state.camera.lookAt(targetLookAt);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {drivingVehicle ? (
        <>
          <group position={[0, -0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
            {vehicleMesh}
          </group>
          {drivingVehicle.itemId === 'bike' && (
            <group position={[0, 0.8, 0]} scale={[0.5, 0.5, 0.5]}>
              {activeAvatar === 'boy' && <BoyModel leftArmRef={leftArmRef} rightArmRef={rightArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />}
              {activeAvatar === 'knight' && <KnightModel leftArmRef={leftArmRef} rightArmRef={rightArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />}
              {activeAvatar === 'robot' && <RobotModel leftArmRef={leftArmRef} rightArmRef={rightArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />}
            </group>
          )}
        </>
      ) : (
        <group scale={[0.5, 0.5, 0.5]}>
          {activeAvatar === 'boy' && <BoyModel leftArmRef={leftArmRef} rightArmRef={rightArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />}
          {activeAvatar === 'knight' && <KnightModel leftArmRef={leftArmRef} rightArmRef={rightArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />}
          {activeAvatar === 'robot' && <RobotModel leftArmRef={leftArmRef} rightArmRef={rightArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />}
        </group>
      )}
    </group>
  );
}

// Sub-components for models

function BoyModel({ leftArmRef, rightArmRef, leftLegRef, rightLegRef }: any) {
  return (
    <>
      <group position={[0, 1.4, 0]}>
        <mesh castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#fcd34d" /></mesh>
        <mesh position={[0, 0.28, 0]} castShadow><boxGeometry args={[0.55, 0.15, 0.55]} /><meshStandardMaterial color="#3e2723" /></mesh>
        <mesh position={[-0.1, 0.05, 0.26]} castShadow><boxGeometry args={[0.08, 0.08, 0.05]} /><meshStandardMaterial color="#111827" /></mesh>
        <mesh position={[0.1, 0.05, 0.26]} castShadow><boxGeometry args={[0.08, 0.08, 0.05]} /><meshStandardMaterial color="#111827" /></mesh>
      </group>
      <mesh position={[0, 0.85, 0]} castShadow><boxGeometry args={[0.6, 0.6, 0.3]} /><meshStandardMaterial color="#3b82f6" /></mesh>
      <group ref={leftArmRef} position={[-0.4, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.2, 0.6, 0.2]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      </group>
      <group ref={rightArmRef} position={[0.4, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.2, 0.6, 0.2]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      </group>
      <group ref={leftLegRef} position={[-0.15, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow><boxGeometry args={[0.25, 0.5, 0.25]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
      </group>
      <group ref={rightLegRef} position={[0.15, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow><boxGeometry args={[0.25, 0.5, 0.25]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
      </group>
    </>
  );
}

function KnightModel({ leftArmRef, rightArmRef, leftLegRef, rightLegRef }: any) {
  return (
    <>
      <group position={[0, 1.4, 0]}>
        {/* Helmet */}
        <mesh castShadow><boxGeometry args={[0.55, 0.55, 0.55]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} /></mesh>
        {/* Visor slit */}
        <mesh position={[0, 0.05, 0.28]} castShadow><boxGeometry args={[0.4, 0.1, 0.05]} /><meshStandardMaterial color="#1e293b" /></mesh>
        {/* Plume */}
        <mesh position={[0, 0.35, -0.1]} castShadow><boxGeometry args={[0.1, 0.4, 0.3]} /><meshStandardMaterial color="#dc2626" /></mesh>
      </group>
      {/* Armor Body */}
      <mesh position={[0, 0.85, 0]} castShadow><boxGeometry args={[0.65, 0.65, 0.35]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>
      {/* Belt */}
      <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.66, 0.1, 0.36]} /><meshStandardMaterial color="#78350f" /></mesh>

      {/* Left Arm with Shield */}
      <group ref={leftArmRef} position={[-0.45, 1.15, 0]}>
        {/* Shoulder pad */}
        <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.3, 0.2, 0.3]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} /></mesh>
        <mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.2, 0.6, 0.2]} /><meshStandardMaterial color="#64748b" metalness={0.6} /></mesh>
        {/* Shield */}
        <mesh position={[-0.15, -0.2, 0.1]} castShadow><boxGeometry args={[0.1, 0.6, 0.5]} /><meshStandardMaterial color="#b91c1c" metalness={0.4} /></mesh>
      </group>

      {/* Right Arm with Sword */}
      <group ref={rightArmRef} position={[0.45, 1.15, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.3, 0.2, 0.3]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} /></mesh>
        <mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.2, 0.6, 0.2]} /><meshStandardMaterial color="#64748b" metalness={0.6} /></mesh>
        {/* Sword */}
        <mesh position={[0, -0.5, 0.2]} rotation={[Math.PI / 4, 0, 0]} castShadow><boxGeometry args={[0.05, 0.8, 0.1]} /><meshStandardMaterial color="#f8fafc" metalness={1} roughness={0.1} /></mesh>
      </group>

      <group ref={leftLegRef} position={[-0.2, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow><boxGeometry args={[0.28, 0.5, 0.28]} /><meshStandardMaterial color="#475569" metalness={0.5} /></mesh>
      </group>
      <group ref={rightLegRef} position={[0.2, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow><boxGeometry args={[0.28, 0.5, 0.28]} /><meshStandardMaterial color="#475569" metalness={0.5} /></mesh>
      </group>
    </>
  );
}

function RobotModel({ leftArmRef, rightArmRef, leftLegRef, rightLegRef }: any) {
  return (
    <>
      <group position={[0, 1.5, 0]}>
        {/* Head */}
        <mesh castShadow><boxGeometry args={[0.6, 0.4, 0.5]} /><meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.4} /></mesh>
        {/* Glowing Eyes */}
        <mesh position={[-0.15, 0.05, 0.26]} castShadow><boxGeometry args={[0.15, 0.08, 0.05]} /><meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} /></mesh>
        <mesh position={[0.15, 0.05, 0.26]} castShadow><boxGeometry args={[0.15, 0.08, 0.05]} /><meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} /></mesh>
        {/* Antennas */}
        <mesh position={[-0.2, 0.3, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
        <mesh position={[-0.2, 0.4, 0]} castShadow><sphereGeometry args={[0.06]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} /></mesh>
        <mesh position={[0.2, 0.3, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
        <mesh position={[0.2, 0.4, 0]} castShadow><sphereGeometry args={[0.06]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} /></mesh>
      </group>

      {/* Body */}
      <mesh position={[0, 0.85, 0]} castShadow><cylinderGeometry args={[0.35, 0.3, 0.7, 8]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.5} /></mesh>
      {/* Body Screen/Meter */}
      <mesh position={[0, 0.9, 0.32]} castShadow><boxGeometry args={[0.4, 0.2, 0.05]} /><meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} /></mesh>

      <group ref={leftArmRef} position={[-0.45, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.6]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} /></mesh>
        {/* Claw */}
        <mesh position={[0, -0.55, 0]} castShadow><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#ef4444" /></mesh>
      </group>

      <group ref={rightArmRef} position={[0.45, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.6]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} /></mesh>
        {/* Claw */}
        <mesh position={[0, -0.55, 0]} castShadow><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#ef4444" /></mesh>
      </group>

      <group ref={leftLegRef} position={[-0.2, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.5]} /><meshStandardMaterial color="#64748b" metalness={0.7} /></mesh>
        {/* Foot */}
        <mesh position={[0, -0.55, 0.05]} castShadow><boxGeometry args={[0.2, 0.1, 0.3]} /><meshStandardMaterial color="#334155" /></mesh>
      </group>
      <group ref={rightLegRef} position={[0.2, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.5]} /><meshStandardMaterial color="#64748b" metalness={0.7} /></mesh>
        {/* Foot */}
        <mesh position={[0, -0.55, 0.05]} castShadow><boxGeometry args={[0.2, 0.1, 0.3]} /><meshStandardMaterial color="#334155" /></mesh>
      </group>
    </>
  );
}
