"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
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

/* ─── Spatial Hash Grid for Minecraft-grade O(1) Collision Detection ─── */
interface CachedBlock {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
  bottomY: number;
  origX: number;
  origY: number;
  origZ: number;
  w: number;
  d: number;
  h: number;
  rotY: number;
  sinRot: number;
  cosRot: number;
  blockShape?: 'box' | 'wedge' | 'pyramid';
  type?: string;
  curveness?: number;
  checkId: number;
}

const COLLISION_CELL_SIZE = 3;

class SpatialCollisionGrid {
  private cells = new Map<string, CachedBlock[]>();
  private queryId = 0;

  constructor(objects: any[]) {
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (o.isOpen) continue; // Walk through open doors

      const w = o.w || o.width || 1;
      const d = o.d || o.depth || 1;
      const h = o.h || o.thickness || 1;
      const rotY = o.rotationY || 0;
      const hw = w / 2;
      const hd = d / 2;

      let minX: number, maxX: number, minZ: number, maxZ: number;
      if (rotY !== 0) {
        const cos = Math.abs(Math.cos(rotY));
        const sin = Math.abs(Math.sin(rotY));
        const extentX = hw * cos + hd * sin;
        const extentZ = hw * sin + hd * cos;
        minX = o.x - extentX;
        maxX = o.x + extentX;
        minZ = o.z - extentZ;
        maxZ = o.z + extentZ;
      } else {
        minX = o.x - hw;
        maxX = o.x + hw;
        minZ = o.z - hd;
        maxZ = o.z + hd;
      }

      const cached: CachedBlock = {
        minX,
        maxX,
        minZ,
        maxZ,
        topY: o.y + h,
        bottomY: o.y,
        origX: o.x,
        origY: o.y,
        origZ: o.z,
        w,
        d,
        h,
        rotY,
        sinRot: Math.sin(-rotY),
        cosRot: Math.cos(-rotY),
        blockShape: o.blockShape,
        type: o.type,
        curveness: o.curveness,
        checkId: 0,
      };

      const minCX = Math.floor(minX / COLLISION_CELL_SIZE);
      const maxCX = Math.floor(maxX / COLLISION_CELL_SIZE);
      const minCZ = Math.floor(minZ / COLLISION_CELL_SIZE);
      const maxCZ = Math.floor(maxZ / COLLISION_CELL_SIZE);

      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cz = minCZ; cz <= maxCZ; cz++) {
          const key = `${cx}_${cz}`;
          let cell = this.cells.get(key);
          if (!cell) {
            cell = [];
            this.cells.set(key, cell);
          }
          cell.push(cached);
        }
      }
    }
  }

  public query(x: number, z: number, radius = 0.5): CachedBlock[] {
    this.queryId++;
    const curId = this.queryId;
    const minCX = Math.floor((x - radius) / COLLISION_CELL_SIZE);
    const maxCX = Math.floor((x + radius) / COLLISION_CELL_SIZE);
    const minCZ = Math.floor((z - radius) / COLLISION_CELL_SIZE);
    const maxCZ = Math.floor((z + radius) / COLLISION_CELL_SIZE);

    const result: CachedBlock[] = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const cell = this.cells.get(`${cx}_${cz}`);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const b = cell[i];
          if (b.checkId !== curId) {
            b.checkId = curId;
            result.push(b);
          }
        }
      }
    }
    return result;
  }

  public getTopSurfaceAt(x: number, z: number): number {
    const blocks = this.query(x, z, 0.5);
    let top = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        if (b.topY > top) top = b.topY;
      }
    }
    return top;
  }
}

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

  // Memoize spatial collision grid so it only rebuilds when objects change
  const spatialGrid = useMemo(() => new SpatialCollisionGrid(objects), [objects]);

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

    // ─── Initial Spawn: Corner of Bottom Surface (No falling from sky) ───
    if (!initialized.current) {
      let startX = 0;
      let startZ = 0;
      let startY = 0;
      let startRot = 0;

      if (drivingVehicle) {
        startX = drivingVehicle.x;
        startY = drivingVehicle.y;
        startZ = drivingVehicle.z;
        startRot = (drivingVehicle.rotationY || 0) - Math.PI / 2;
      } else {
        const halfLand = (landSize ?? 50) / 2;
        // Exact corner block space in bottom surface:
        startX = Math.round(-halfLand + 3);
        startZ = Math.round(halfLand - 3);
        startY = spatialGrid.getTopSurfaceAt(startX, startZ);
        // Face inward toward the center of the world
        startRot = Math.atan2(-startX, -startZ);
      }

      pos.current.set(startX, startY, startZ);
      logicalY.current = startY;
      targetRotation.current = startRot;
      groupRef.current.position.set(startX, startY, startZ);
      groupRef.current.rotation.y = startRot;
      playerState.pos.copy(pos.current);
      playerState.rotation = startRot;

      // Snap camera directly behind player at ground level (prevents falling from the sky)
      const initCamDist = drivingVehicle ? 6 : 2.5;
      const initCamHeight = drivingVehicle ? 3 : 1.5;
      const initCamX = startX - Math.sin(startRot) * initCamDist;
      const initCamZ = startZ - Math.cos(startRot) * initCamDist;
      const initCamY = startY + initCamHeight;
      const initLookAt = new THREE.Vector3(startX, startY + 1, startZ);

      state.camera.position.set(initCamX, initCamY, initCamZ);
      state.camera.lookAt(initLookAt);

      if (state.controls) {
        const controls = state.controls as any;
        controls.target.copy(initLookAt);
        controls.update();
      }

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
        if (controlsRef.left) turnAmount = 0.5;
        if (controlsRef.right) turnAmount = -0.5;
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

    // ─── Fast O(1) Local Collision Check ───
    const checkCollision = (x: number, z: number, currentY: number) => {
      const r = 0.25;
      const stepHeight = 1.1;
      const playerHeight = 1.5;
      let floorY = 0;
      let wallHit = false;

      const nearby = spatialGrid.query(x, z, r + 0.5);

      for (let i = 0; i < nearby.length; i++) {
        const b = nearby[i];

        const playerMinX = x - r;
        const playerMaxX = x + r;
        const playerMinZ = z - r;
        const playerMaxZ = z + r;

        if (playerMaxX > b.minX && playerMinX < b.maxX &&
            playerMaxZ > b.minZ && playerMinZ < b.maxZ) {
          
          let topY = b.topY;
          const bottomY = b.bottomY;

          const localX = x - b.origX;
          const localZ = z - b.origZ;
          let lx = localX;
          let lz = localZ;
          if (b.rotY !== 0) {
            lx = localX * b.cosRot - localZ * b.sinRot;
            lz = localX * b.sinRot + localZ * b.cosRot;
          }

          const nx = Math.max(-0.5, Math.min(0.5, lx / b.w));
          const nz = Math.max(-0.5, Math.min(0.5, lz / b.d));

          if (b.blockShape === 'wedge') {
            const localHeight = Math.max(0, Math.min(1, 0.5 - nx));
            topY = b.origY + localHeight * b.h;
          } else if (b.blockShape === 'pyramid' || (b.type === 'roof' && Math.round(b.curveness || 0) === 0)) {
            const localHeight = Math.max(0, Math.min(1, (0.5 - Math.max(Math.abs(nx), Math.abs(nz))) * 2));
            topY = b.origY + localHeight * b.h;
          } else if (b.type === 'roof') {
            const rDist = Math.sqrt(nx * nx + nz * nz);
            const localHeight = Math.max(0, Math.min(1, 1 - rDist / 0.7071));
            topY = b.origY + localHeight * b.h;
          }

          if (topY <= currentY + stepHeight) {
            if (topY > floorY) floorY = topY;
          } else if (bottomY < currentY + playerHeight) {
            wallHit = true;
          }
        }
      }

      return { floorY, wallHit };
    };

    const currentY = logicalY.current;
    let targetX = pos.current.x;
    let targetZ = pos.current.z;
    let finalFloorY = currentY;

    if (moving) {
      targetX = pos.current.x + velocity.current.x * delta;
      targetZ = pos.current.z + velocity.current.z * delta;

      let { wallHit: wallHitX } = checkCollision(targetX, pos.current.z, currentY);
      if (wallHitX) targetX = pos.current.x;

      let { wallHit: wallHitZ } = checkCollision(pos.current.x, targetZ, currentY);
      if (wallHitZ) targetZ = pos.current.z;

      let { floorY: compFloorY, wallHit: finalWallHit } = checkCollision(targetX, targetZ, currentY);
      finalFloorY = compFloorY;

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
    }

    playerState.pos.copy(pos.current);
    playerState.rotation = targetRotation.current;

    pos.current.y = THREE.MathUtils.lerp(pos.current.y, finalFloorY, delta * 15);

    // Only compute pitch & roll when driving vehicle
    if (drivingVehicle) {
      const yaw = groupRef.current.rotation.y;
      const sinYaw = Math.sin(yaw);
      const cosYaw = Math.cos(yaw);
      const forwardOffset = 0.4;
      const sideOffset = 0.4;

      const frontY = checkCollision(targetX + sinYaw * forwardOffset, targetZ + cosYaw * forwardOffset, finalFloorY).floorY;
      const backY = checkCollision(targetX - sinYaw * forwardOffset, targetZ - cosYaw * forwardOffset, finalFloorY).floorY;
      const rightY = checkCollision(targetX + cosYaw * sideOffset, targetZ - sinYaw * sideOffset, finalFloorY).floorY;
      const leftY = checkCollision(targetX - cosYaw * sideOffset, targetZ + sinYaw * sideOffset, finalFloorY).floorY;

      const targetPitch = Math.atan2(backY - frontY, forwardOffset * 2);
      const targetRoll = Math.atan2(rightY - leftY, sideOffset * 2);

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, delta * 10);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRoll, delta * 10);
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 10);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 10);
    }

    groupRef.current.position.copy(pos.current);

    if (leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current) {
      const swing = Math.sin(walkTime.current) * 0.5;
      leftLegRef.current.rotation.x = swing;
      rightLegRef.current.rotation.x = -swing;
      leftArmRef.current.rotation.x = -swing;
      rightArmRef.current.rotation.x = swing;
    }

    // ─── Responsive Chase Camera Logic ───
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

      state.camera.position.lerp(idealCamPos, delta * 6);
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
