import React, { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

export const GroupGizmo = ({ objects, selectedIds, onUpdateObjects, isGizmoDragging, setIsGizmoDragging, onDragEnd }: any) => {
  const { camera, size } = useThree();
  const selectedObjs = objects.filter((o: any) => selectedIds.includes(o.id || `${o.x},${o.y},${o.z}`));

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



  return (
    <group>
      <Line points={points} color="#d946ef" lineWidth={2} />
      <Line points={[edges[0], edges[1]]} color="#d946ef" lineWidth={2} />
      <Line points={[edges[2], edges[3]]} color="#d946ef" lineWidth={2} />
      <Line points={[edges[4], edges[5]]} color="#d946ef" lineWidth={2} />
    </group>
  );
};
