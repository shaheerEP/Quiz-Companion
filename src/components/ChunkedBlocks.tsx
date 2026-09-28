"use client";

import React, { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import {
  getCurvedGeometry,
  getRoofGeometry,
  getWedgeGeometry,
  getPyramidGeometry
} from "@/components/BlockGeometries";

export type PlacedObject = {
  x: number;
  y: number;
  z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  w?: number;
  d?: number;
  h?: number;
  thickness?: number;
  depth?: number;
  width?: number;
  curveness?: number;
  blockShape?: 'box' | 'wedge' | 'pyramid';
  isOpen?: boolean;
  materialType?: 'color' | 'texture' | 'glass';
  textureId?: string;
  _id?: any;
};

const CHUNK_SIZE = 16; // 16x16 Minecraft-style chunk partitioning

export function getBoxProps(data: PlacedObject) {
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
}

/**
 * Minecraft-style Interior Block Occlusion Culling.
 * Identifies standard 1x1x1 solid opaque blocks completely surrounded on all 6 faces
 * (top, bottom, left, right, front, back) by other solid opaque blocks.
 * These interior blocks are 100% invisible to the camera and are omitted from rendering,
 * drastically reducing draw calls, triangle counts, and shadow rendering.
 */
function cullHiddenInteriorBlocks(
  objects: PlacedObject[],
  preservedBlockIds?: Set<string>,
  disabled?: boolean
): PlacedObject[] {
  if (disabled) return objects;

  const solidMap = new Set<string>();

  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    if (
      (!o.type || o.type === 'block') &&
      (!o.blockShape || o.blockShape === 'box') &&
      (!o.curveness || Math.round(o.curveness) === 0) &&
      o.color !== '#ADD8E6' &&
      o.materialType !== 'glass' &&
      (o.width || 1) === 1 &&
      (o.thickness || 1) === 1 &&
      (o.depth || 1) === 1
    ) {
      solidMap.add(`${Math.round(o.x)},${Math.round(o.y)},${Math.round(o.z)}`);
    }
  }

  // If world has few solid blocks, keep all to avoid premature culling while building
  if (solidMap.size < 64) return objects;

  const visible: PlacedObject[] = [];

  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];

    // Always keep items, roofs, transparent glass, curved shapes, wedges, pyramids, scaled blocks
    if (
      o.type === 'item' ||
      o.type === 'roof' ||
      o.type === 'large-roof' ||
      (o.blockShape && o.blockShape !== 'box') ||
      (o.curveness && Math.round(o.curveness) > 0) ||
      o.color === '#ADD8E6' ||
      o.materialType === 'glass' ||
      (o.width && o.width !== 1) ||
      (o.thickness && o.thickness !== 1) ||
      (o.depth && o.depth !== 1)
    ) {
      visible.push(o);
      continue;
    }

    // Never cull blocks selected by the user in builder mode (check both comma and underscore formats)
    const blockKeyUnderscore = `${o.x}_${o.y}_${o.z}`;
    const blockKeyComma = `${o.x},${o.y},${o.z}`;
    if (preservedBlockIds && (preservedBlockIds.has(blockKeyUnderscore) || preservedBlockIds.has(blockKeyComma))) {
      visible.push(o);
      continue;
    }

    const rx = Math.round(o.x);
    const ry = Math.round(o.y);
    const rz = Math.round(o.z);

    const isEnclosed =
      solidMap.has(`${rx + 1},${ry},${rz}`) &&
      solidMap.has(`${rx - 1},${ry},${rz}`) &&
      solidMap.has(`${rx},${ry + 1},${rz}`) &&
      solidMap.has(`${rx},${ry - 1},${rz}`) &&
      solidMap.has(`${rx},${ry},${rz + 1}`) &&
      solidMap.has(`${rx},${ry},${rz - 1}`);

    if (!isEnclosed) {
      visible.push(o);
    }
  }

  return visible;
}

interface ProcessedBlock {
  data: PlacedObject;
  props: {
    position: [number, number, number];
    scale: [number, number, number];
    rotation: [number, number, number];
  };
}

interface ChunkMaterialGroup {
  mat: {
    type: string;
    id: string;
    transparent: boolean;
    glass: boolean;
    texture: THREE.Texture | null;
  };
  boxesByCurveness: { level: number; blocks: ProcessedBlock[] }[];
  wedges: ProcessedBlock[];
  pyramids: ProcessedBlock[];
  roofsByCurveness: { level: number; segments: number; blocks: ProcessedBlock[] }[];
}

interface RenderChunk {
  key: string;
  cx: number;
  cz: number;
  groups: ChunkMaterialGroup[];
}

interface ChunkedBlocksProps {
  objects: PlacedObject[];
  textures: Record<string, THREE.Texture | null>;
  selectedBlockIds?: string[];
  prefabSelectionIds?: string[];
  onBlockClick?: (data: PlacedObject, faceNormal?: THREE.Vector3, point?: THREE.Vector3) => void;
  isDraggingFn?: () => boolean;
  disableOcclusionCulling?: boolean;
}

export function ChunkedBlocks({
  objects,
  textures,
  selectedBlockIds,
  prefabSelectionIds,
  onBlockClick,
  isDraggingFn,
  disableOcclusionCulling
}: ChunkedBlocksProps) {
  const curvenessLevels = [0, 1, 2, 3, 4];
  const boxShapes = ['box', undefined];

  // Pre-process and chunk blocks whenever objects or selections change
  const renderChunks: RenderChunk[] = useMemo(() => {
    // Collect preserved block IDs (selected/prefab)
    let preservedSet: Set<string> | undefined;
    if (selectedBlockIds?.length || prefabSelectionIds?.length) {
      preservedSet = new Set<string>();
      selectedBlockIds?.forEach(id => {
        preservedSet!.add(id);
        preservedSet!.add(id.replace(/,/g, '_'));
      });
      prefabSelectionIds?.forEach(id => {
        preservedSet!.add(id);
        preservedSet!.add(id.replace(/,/g, '_'));
      });
    }

    // Step 1: Occlusion Culling
    const visibleObjects = cullHiddenInteriorBlocks(objects, preservedSet, disableOcclusionCulling);

    // Filter to non-item blocks
    const blockObjects = visibleObjects.filter(o => o.type !== 'item');

    const blockMaterials = [
      { type: 'color', id: 'color', transparent: false, glass: false, texture: null },
      { type: 'glass', id: 'glass', transparent: true, glass: true, texture: null },
      { type: 'texture', id: 'wood', transparent: false, glass: false, texture: textures?.wood || null },
      { type: 'texture', id: 'stone', transparent: false, glass: false, texture: textures?.stone || null },
      { type: 'texture', id: 'brick', transparent: false, glass: false, texture: textures?.brick || null },
      { type: 'texture', id: 'shingles', transparent: false, glass: false, texture: textures?.shingles || null },
      { type: 'texture', id: 'tile', transparent: false, glass: false, texture: textures?.tile || null },
    ];

    // Step 2: Bucket into 16x16 horizontal spatial chunks
    const chunkMap = new Map<string, PlacedObject[]>();

    for (let i = 0; i < blockObjects.length; i++) {
      const obj = blockObjects[i];
      const cx = Math.floor(obj.x / CHUNK_SIZE);
      const cz = Math.floor(obj.z / CHUNK_SIZE);
      const key = `${cx}_${cz}`;
      let list = chunkMap.get(key);
      if (!list) {
        list = [];
        chunkMap.set(key, list);
      }
      list.push(obj);
    }

    const chunks: RenderChunk[] = [];

    chunkMap.forEach((chunkBlocks, key) => {
      const [cxStr, czStr] = key.split('_');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);

      const groups: ChunkMaterialGroup[] = [];

      for (let m = 0; m < blockMaterials.length; m++) {
        const mat = blockMaterials[m];

        let subset: PlacedObject[];
        if (mat.type === 'color') {
          subset = chunkBlocks.filter(o => (o.materialType === 'color' || !o.materialType) && o.color !== "#ADD8E6");
        } else if (mat.type === 'glass') {
          subset = chunkBlocks.filter(o => o.color === "#ADD8E6" || o.materialType === 'glass');
        } else {
          subset = chunkBlocks.filter(o => o.materialType === 'texture' && o.textureId === mat.id);
        }

        if (subset.length === 0) continue;

        const boxes = subset.filter(o => (!o.type || o.type === 'block' || o.type === 'large-roof'));
        const roofs = subset.filter(o => o.type === 'roof');

        const boxesByCurveness = curvenessLevels
          .map(level => {
            const matched = boxes.filter(o => boxShapes.includes(o.blockShape) && Math.round(o.curveness || 0) === level);
            if (matched.length === 0) return null;
            return {
              level,
              blocks: matched.map(data => ({ data, props: getBoxProps(data) }))
            };
          })
          .filter(Boolean) as { level: number; blocks: ProcessedBlock[] }[];

        const wedgeBlocks = boxes
          .filter(o => o.blockShape === 'wedge')
          .map(data => ({ data, props: getBoxProps(data) }));

        const pyramidBlocks = boxes
          .filter(o => o.blockShape === 'pyramid')
          .map(data => ({ data, props: getBoxProps(data) }));

        const roofsByCurveness = curvenessLevels
          .map(level => {
            const matched = roofs.filter(o => Math.round(o.curveness || 0) === level);
            if (matched.length === 0) return null;
            const segments = level === 0 ? 4 : level === 1 ? 8 : level === 2 ? 16 : level === 3 ? 24 : 32;
            return {
              level,
              segments,
              blocks: matched.map(data => ({ data, props: getBoxProps(data) }))
            };
          })
          .filter(Boolean) as { level: number; segments: number; blocks: ProcessedBlock[] }[];

        if (
          boxesByCurveness.length > 0 ||
          wedgeBlocks.length > 0 ||
          pyramidBlocks.length > 0 ||
          roofsByCurveness.length > 0
        ) {
          groups.push({
            mat,
            boxesByCurveness,
            wedges: wedgeBlocks,
            pyramids: pyramidBlocks,
            roofsByCurveness
          });
        }
      }

      if (groups.length > 0) {
        chunks.push({ key, cx, cz, groups });
      }
    });

    return chunks;
  }, [objects, textures, selectedBlockIds, prefabSelectionIds]);

  return (
    <>
      {renderChunks.map(chunk => (
        <group key={`chunk-${chunk.key}`}>
          {chunk.groups.map(group => {
            const mat = group.mat;
            const matKey = `mat-${chunk.key}-${mat.id}`;

            return (
              <group key={matKey}>
                {/* Standard Boxes / Blocks */}
                {group.boxesByCurveness.map(curveGroup => {
                  const capacity = Math.max(1000, Math.ceil((curveGroup.blocks.length + 100) / 500) * 500);
                  return (
                    <Instances
                      key={`bx-${chunk.key}-${mat.id}-${curveGroup.level}-${capacity}`}
                      limit={capacity}
                      castShadow
                      receiveShadow
                      frustumCulled={false}
                    >
                      <primitive object={getCurvedGeometry(curveGroup.level)} attach="geometry" />
                      <meshStandardMaterial
                        map={mat.texture || undefined}
                        transparent={mat.transparent}
                        opacity={mat.transparent ? 0.6 : 1}
                      />
                      {curveGroup.blocks.map((item, idx) => (
                        <Instance
                          key={item.data._id ? `b-${item.data._id}` : `b-${item.data.x}_${item.data.y}_${item.data.z}-${idx}`}
                          position={item.props.position}
                          scale={item.props.scale}
                          rotation={item.props.rotation}
                          color={mat.type === 'texture' ? "#ffffff" : item.data.color}
                          onClick={
                            onBlockClick
                              ? (e) => {
                                  if (isDraggingFn && isDraggingFn()) return;
                                  e.stopPropagation();
                                  onBlockClick(item.data, e.face?.normal, e.point);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </Instances>
                  );
                })}

                {/* Wedges */}
                {group.wedges.length > 0 && (() => {
                  const capacity = Math.max(500, Math.ceil((group.wedges.length + 100) / 250) * 250);
                  return (
                    <Instances
                      key={`w-${chunk.key}-${mat.id}-${capacity}`}
                      limit={capacity}
                      castShadow
                      receiveShadow
                      frustumCulled={false}
                    >
                      <primitive object={getWedgeGeometry()} attach="geometry" />
                      <meshStandardMaterial
                        map={mat.texture || undefined}
                        transparent={mat.transparent}
                        opacity={mat.transparent ? 0.6 : 1}
                      />
                      {group.wedges.map((item, idx) => (
                        <Instance
                          key={item.data._id ? `w-${item.data._id}` : `w-${item.data.x}_${item.data.y}_${item.data.z}-${idx}`}
                          position={item.props.position}
                          scale={item.props.scale}
                          rotation={item.props.rotation}
                          color={mat.type === 'texture' ? "#ffffff" : item.data.color}
                          onClick={
                            onBlockClick
                              ? (e) => {
                                  if (isDraggingFn && isDraggingFn()) return;
                                  e.stopPropagation();
                                  onBlockClick(item.data, e.face?.normal, e.point);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </Instances>
                  );
                })()}

                {/* Pyramids */}
                {group.pyramids.length > 0 && (() => {
                  const capacity = Math.max(500, Math.ceil((group.pyramids.length + 100) / 250) * 250);
                  return (
                    <Instances
                      key={`p-${chunk.key}-${mat.id}-${capacity}`}
                      limit={capacity}
                      castShadow
                      receiveShadow
                      frustumCulled={false}
                    >
                      <primitive object={getPyramidGeometry()} attach="geometry" />
                      <meshStandardMaterial
                        map={mat.texture || undefined}
                        transparent={mat.transparent}
                        opacity={mat.transparent ? 0.6 : 1}
                      />
                      {group.pyramids.map((item, idx) => (
                        <Instance
                          key={item.data._id ? `p-${item.data._id}` : `p-${item.data.x}_${item.data.y}_${item.data.z}-${idx}`}
                          position={item.props.position}
                          scale={item.props.scale}
                          rotation={item.props.rotation}
                          color={mat.type === 'texture' ? "#ffffff" : item.data.color}
                          onClick={
                            onBlockClick
                              ? (e) => {
                                  if (isDraggingFn && isDraggingFn()) return;
                                  e.stopPropagation();
                                  onBlockClick(item.data, e.face?.normal, e.point);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </Instances>
                  );
                })()}

                {/* Roofs */}
                {group.roofsByCurveness.map(roofGroup => {
                  const capacity = Math.max(500, Math.ceil((roofGroup.blocks.length + 100) / 250) * 250);
                  return (
                    <Instances
                      key={`rf-${chunk.key}-${mat.id}-${roofGroup.level}-${capacity}`}
                      limit={capacity}
                      castShadow
                      receiveShadow
                      frustumCulled={false}
                    >
                      <primitive object={getRoofGeometry(roofGroup.segments)} attach="geometry" />
                      <meshStandardMaterial
                        map={mat.texture || undefined}
                        transparent={mat.transparent}
                        opacity={mat.transparent ? 0.6 : 1}
                      />
                      {roofGroup.blocks.map((item, idx) => (
                        <Instance
                          key={item.data._id ? `r-${item.data._id}` : `r-${item.data.x}_${item.data.y}_${item.data.z}-${idx}`}
                          position={[
                            item.data.x,
                            item.data.y - 0.5 + (item.data.thickness || 1) / 2,
                            item.data.z
                          ]}
                          rotation={[0, Math.PI / 4, 0]}
                          scale={[
                            item.data.width || 1,
                            item.data.thickness || 1,
                            item.data.depth || 1
                          ]}
                          color={mat.type === 'texture' ? "#ffffff" : item.data.color}
                          onClick={
                            onBlockClick
                              ? (e) => {
                                  if (isDraggingFn && isDraggingFn()) return;
                                  e.stopPropagation();
                                  onBlockClick(item.data, e.face?.normal, e.point);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </Instances>
                  );
                })}
              </group>
            );
          })}
        </group>
      ))}
    </>
  );
}
