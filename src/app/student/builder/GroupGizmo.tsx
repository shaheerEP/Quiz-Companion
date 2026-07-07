import React, { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

export const GroupGizmo = ({ objects, selectedIds, onUpdateObjects, isGizmoDragging, setIsGizmoDragging, onDragEnd }: any) => {
  const { camera, size } = useThree();
  const selectedObjs = objects.filter((o: any) => selectedIds.includes(o.id || `${o.x}-${o.y}-${o.z}`));

  if (selectedObjs.length < 1) return null;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  selectedObjs.forEach((o: any) => {
    const hw = (o.width || 1) / 2;
    const hh = ((o.type === 'large-roof' ? o.h : o.thickness) || 1) / 2;
    const hd = (o.depth || 1) / 2;
    minX = Math.min(minX, o.x - hw);
    maxX = Math.max(maxX, o.x + hw);
    minZ = Math.min(minZ, o.z - hd);
    maxZ = Math.max(maxZ, o.z + hd);
    minY = Math.min(minY, o.y - 0.5);
    maxY = Math.max(maxY, o.y - 0.5 + hh * 2);
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const d = maxZ - minZ || 1;

  const points = [
    [minX, minY, minZ], [maxX, minY, minZ], [maxX, maxY, minZ], [minX, maxY, minZ], [minX, minY, minZ], // back face
    [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ], [minX, minY, maxZ], // front face
  ].map(p => new THREE.Vector3(p[0], p[1], p[2]));

  // Connect the faces
  const edges = [
    [maxX, minY, minZ], [maxX, minY, maxZ],
    [maxX, maxY, minZ], [maxX, maxY, maxZ],
    [minX, maxY, minZ], [minX, maxY, maxZ]
  ].map(p => new THREE.Vector3(p[0], p[1], p[2]));

  const dragRef = useRef<{ 
    startX: number, startY: number, 
    initialObjects: any[], 
    type: 'scale' | 'rotate',
    startW: number, startD: number,
    startAngle: number
  } | null>(null);

  const handlePointerDown = (e: any, type: 'scale' | 'rotate') => {
    e.stopPropagation();
    setIsGizmoDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialObjects: JSON.parse(JSON.stringify(selectedObjs)), // deep clone
      type,
      startW: w,
      startD: d,
      startAngle: 0
    };
    if (e.target && e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!dragRef.current || !isGizmoDragging) return;
    e.stopPropagation();

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (dragRef.current.type === 'scale') {
      const scaleFactor = Math.max(0.1, 1 + (dx - dy) * 0.005);
      
      const newObjs = dragRef.current.initialObjects.map(o => {
        const nx = cx + (o.x - cx) * scaleFactor;
        const nz = cz + (o.z - cz) * scaleFactor;
        const nw = (o.width || 1) * scaleFactor;
        const nd = (o.depth || 1) * scaleFactor;
        
        return {
          ...o,
          x: nx,
          z: nz,
          width: nw,
          depth: nd
        };
      });

      const allObjs = [...objects];
      newObjs.forEach(no => {
        const idx = allObjs.findIndex((ao: any) => (ao.id || `${ao.x}-${ao.y}-${ao.z}`) === (no.id || `${no.x}-${no.y}-${no.z}`));
        if (idx !== -1) allObjs[idx] = no;
      });
      onUpdateObjects(allObjs);
    } else if (dragRef.current.type === 'rotate') {
      const angle = (dx * 0.01);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const newObjs = dragRef.current.initialObjects.map(o => {
        const relX = o.x - cx;
        const relZ = o.z - cz;
        
        const nx = cx + (relX * cosA - relZ * sinA);
        const nz = cz + (relX * sinA + relZ * cosA);
        
        const rotY = (o.rotationY || 0) - angle;

        return {
          ...o,
          x: nx,
          z: nz,
          rotationY: rotY
        };
      });

      const allObjs = [...objects];
      newObjs.forEach(no => {
        const idx = allObjs.findIndex((ao: any) => (ao.id || `${ao.x}-${ao.y}-${ao.z}`) === (no.id || `${no.x}-${no.y}-${no.z}`));
        if (idx !== -1) allObjs[idx] = no;
      });
      onUpdateObjects(allObjs);
    }
  };

  const handlePointerUp = (e: any) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    setIsGizmoDragging(false);
    dragRef.current = null;
    if (e.target && e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId);
    }
    if (onDragEnd) onDragEnd();
  };

  const corners = [
    [minX, minY, minZ], [maxX, minY, minZ], [minX, minY, maxZ], [maxX, minY, maxZ],
    [minX, maxY, minZ], [maxX, maxY, minZ], [minX, maxY, maxZ], [maxX, maxY, maxZ]
  ];

  return (
    <group>
      <Line points={points} color="#d946ef" lineWidth={2} />
      <Line points={[edges[0], edges[1]]} color="#d946ef" lineWidth={2} />
      <Line points={[edges[2], edges[3]]} color="#d946ef" lineWidth={2} />
      <Line points={[edges[4], edges[5]]} color="#d946ef" lineWidth={2} />

      {corners.map((c, i) => (
        <mesh key={`corner-${i}`} position={[c[0], c[1], c[2]]}
          onPointerDown={(e) => handlePointerDown(e, 'scale')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color="#3b82f6" depthTest={false} transparent opacity={0.8} />
        </mesh>
      ))}

      <mesh position={[cx, maxY + 0.5, cz]} rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={(e) => handlePointerDown(e, 'rotate')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <torusGeometry args={[Math.max(w, d) / 2 + 0.5, 0.1, 16, 64]} />
        <meshBasicMaterial color="#eab308" depthTest={false} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};
