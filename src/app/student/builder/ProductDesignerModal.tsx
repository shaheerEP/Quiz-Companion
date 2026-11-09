"use client";

import React, { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  X,
  Plus,
  Trash2,
  Copy,
  RotateCw,
  Box,
  Layers,
  Save,
  Pencil,
  Circle,
  HelpCircle
} from "lucide-react";
import {
  getCurvedGeometry,
  getWedgeGeometry,
  getPyramidGeometry,
  getRoofGeometry,
  getSphereGeometry,
  getCylinderGeometry,
  getConeGeometry,
  getTorusGeometry,
  getDomeGeometry
} from "@/components/BlockGeometries";

export type ShapeType = 'box' | 'wedge' | 'pyramid' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'dome';

export type ProductBlock = {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  thickness?: number; // Height
  depth?: number;
  width?: number;
  curveness?: number;
  blockShape?: ShapeType;
  materialType?: 'color' | 'texture' | 'glass';
  textureId?: string;
  rotationY?: number;
};

export type CustomProductData = {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  refundOnErase: number;
  width: number;
  height: number;
  depth: number;
  blocks: any[];
};

const BASE_COLORS = [
  { id: "wood", color: "#8B5A2B", name: "Wood" },
  { id: "stone", color: "#808080", name: "Stone" },
  { id: "brick", color: "#B22222", name: "Brick" },
  { id: "gold", color: "#f59e0b", name: "Gold" },
  { id: "emerald", color: "#10b981", name: "Emerald" },
  { id: "sky", color: "#0284c7", name: "Sky Blue" },
  { id: "purple", color: "#8b5cf6", name: "Purple" },
  { id: "dark", color: "#1f2937", name: "Charcoal" },
  { id: "white", color: "#f3f4f6", name: "White" },
];

const AVAILABLE_TEXTURES = [
  { id: "wood", url: "/textures/wood.png", name: "Wood" },
  { id: "stone", url: "/textures/stone.png", name: "Stone" },
  { id: "brick", url: "/textures/brick.png", name: "Brick" },
  { id: "shingles", url: "/textures/shingles.png", name: "Roof" },
  { id: "tile", url: "/textures/tile.png", name: "Tile" },
];

const PRESET_EMOJIS = [
  "🪑", "🛋️", "🚪", "🛏️", "🚗", "🏎️", "🚀", "🛸",
  "👑", "🏆", "💎", "🗿", "🌲", "🌳", "🌸", "🪴",
  "💡", "🤖", "🕹️", "🎮", "🛡️", "⚔️", "☕", "📦",
  "🔮", "🥫", "🍩", "🛖", "🍦", "⛄", "🎸", "🎯"
];

const SHAPE_OPTIONS: { id: ShapeType; name: string; emoji: string; desc: string }[] = [
  { id: "box", name: "Box", emoji: "📦", desc: "Cube block" },
  { id: "sphere", name: "Sphere", emoji: "🔮", desc: "Round ball" },
  { id: "cylinder", name: "Cylinder", emoji: "🥫", desc: "Column / Pipe" },
  { id: "wedge", name: "Wedge", emoji: "📐", desc: "Ramp / Slope" },
  { id: "pyramid", name: "Pyramid", emoji: "🔺", desc: "4-sided roof" },
  { id: "cone", name: "Cone", emoji: "🍦", desc: "Round spike" },
  { id: "torus", name: "Torus", emoji: "🍩", desc: "Donut / Ring" },
  { id: "dome", name: "Dome", emoji: "🛖", desc: "Hemisphere" },
];

const TEMPLATES: Record<string, { name: string; emoji: string; blocks: Omit<ProductBlock, "id">[] }> = {
  chair: {
    name: "Modern Chair",
    emoji: "🪑",
    blocks: [
      // 4 Cylinder Legs
      { x: -0.4, y: 0, z: -0.4, color: "#8B5A2B", width: 0.12, thickness: 0.7, depth: 0.12, blockShape: "cylinder" },
      { x: 0.4, y: 0, z: -0.4, color: "#8B5A2B", width: 0.12, thickness: 0.7, depth: 0.12, blockShape: "cylinder" },
      { x: -0.4, y: 0, z: 0.4, color: "#8B5A2B", width: 0.12, thickness: 0.7, depth: 0.12, blockShape: "cylinder" },
      { x: 0.4, y: 0, z: 0.4, color: "#8B5A2B", width: 0.12, thickness: 0.7, depth: 0.12, blockShape: "cylinder" },
      // Seat with curved bevel
      { x: 0, y: 0.7, z: 0, color: "#B22222", width: 1.0, thickness: 0.15, depth: 1.0, curveness: 2 },
      // Backrest
      { x: 0, y: 1.25, z: -0.42, color: "#B22222", width: 1.0, thickness: 0.9, depth: 0.12, curveness: 2 },
    ]
  },
  desk: {
    name: "Study Desk",
    emoji: "🛋️",
    blocks: [
      // 4 Metal Cylindrical Legs
      { x: -0.8, y: 0, z: -0.4, color: "#1f2937", width: 0.12, thickness: 0.8, depth: 0.12, blockShape: "cylinder" },
      { x: 0.8, y: 0, z: -0.4, color: "#1f2937", width: 0.12, thickness: 0.8, depth: 0.12, blockShape: "cylinder" },
      { x: -0.8, y: 0, z: 0.4, color: "#1f2937", width: 0.12, thickness: 0.8, depth: 0.12, blockShape: "cylinder" },
      { x: 0.8, y: 0, z: 0.4, color: "#1f2937", width: 0.12, thickness: 0.8, depth: 0.12, blockShape: "cylinder" },
      // Tabletop with Wood Texture
      { x: 0, y: 0.8, z: 0, color: "#8B5A2B", width: 1.9, thickness: 0.12, depth: 1.0, materialType: "texture", textureId: "wood" },
      // Desk Lamp on top
      { x: -0.6, y: 0.92, z: -0.2, color: "#f59e0b", width: 0.25, thickness: 0.08, depth: 0.25, blockShape: "cylinder" },
      { x: -0.6, y: 1.0, z: -0.2, color: "#f59e0b", width: 0.06, thickness: 0.35, depth: 0.06, blockShape: "cylinder" },
      { x: -0.6, y: 1.35, z: -0.2, color: "#fef08a", width: 0.2, thickness: 0.2, depth: 0.2, blockShape: "sphere", materialType: "glass" },
    ]
  },
  lamp: {
    name: "Sphere Street Lamp",
    emoji: "💡",
    blocks: [
      // Dome Base
      { x: 0, y: 0, z: 0, color: "#1f2937", width: 0.6, thickness: 0.25, depth: 0.6, blockShape: "dome" },
      // Cylinder Pole
      { x: 0, y: 0.25, z: 0, color: "#1f2937", width: 0.12, thickness: 1.8, depth: 0.12, blockShape: "cylinder" },
      // Glowing Sphere Lamp Head
      { x: 0, y: 2.05, z: 0, color: "#fef08a", width: 0.5, thickness: 0.5, depth: 0.5, blockShape: "sphere", materialType: "glass" },
      // Small Cone Finial on top
      { x: 0, y: 2.55, z: 0, color: "#1f2937", width: 0.2, thickness: 0.2, depth: 0.2, blockShape: "cone" },
    ]
  },
  car: {
    name: "Cyber Speedster",
    emoji: "🏎️",
    blocks: [
      // 4 Torus/Cylinder Wheels
      { x: -0.6, y: 0, z: -0.6, color: "#1f2937", width: 0.3, thickness: 0.4, depth: 0.4, blockShape: "torus" },
      { x: 0.6, y: 0, z: -0.6, color: "#1f2937", width: 0.3, thickness: 0.4, depth: 0.4, blockShape: "torus" },
      { x: -0.6, y: 0, z: 0.6, color: "#1f2937", width: 0.3, thickness: 0.4, depth: 0.4, blockShape: "torus" },
      { x: 0.6, y: 0, z: 0.6, color: "#1f2937", width: 0.3, thickness: 0.4, depth: 0.4, blockShape: "torus" },
      // Chassis
      { x: 0, y: 0.2, z: 0, color: "#0284c7", width: 1.1, thickness: 0.35, depth: 1.7, curveness: 2 },
      // Glass Cockpit Dome
      { x: 0, y: 0.55, z: -0.1, color: "#ADD8E6", width: 0.8, thickness: 0.4, depth: 0.9, blockShape: "dome", materialType: "glass" },
      // Front Cone Headlights
      { x: -0.3, y: 0.3, z: 0.85, color: "#fef08a", width: 0.15, thickness: 0.15, depth: 0.15, blockShape: "sphere" },
      { x: 0.3, y: 0.3, z: 0.85, color: "#fef08a", width: 0.15, thickness: 0.15, depth: 0.15, blockShape: "sphere" },
    ]
  },
  snowman: {
    name: "Frosty Snowman",
    emoji: "⛄",
    blocks: [
      // Base Sphere
      { x: 0, y: 0, z: 0, color: "#f3f4f6", width: 1.2, thickness: 1.0, depth: 1.2, blockShape: "sphere" },
      // Torso Sphere
      { x: 0, y: 0.85, z: 0, color: "#f3f4f6", width: 0.9, thickness: 0.8, depth: 0.9, blockShape: "sphere" },
      // Head Sphere
      { x: 0, y: 1.55, z: 0, color: "#f3f4f6", width: 0.65, thickness: 0.6, depth: 0.65, blockShape: "sphere" },
      // Carrot Nose (Cone)
      { x: 0, y: 1.55, z: 0.35, color: "#f59e0b", width: 0.15, thickness: 0.3, depth: 0.15, blockShape: "cone", rotationY: 0 },
      // Top Hat (Cylinder)
      { x: 0, y: 2.15, z: 0, color: "#1f2937", width: 0.5, thickness: 0.45, depth: 0.5, blockShape: "cylinder" },
      // Hat Brim (Torus/Cylinder)
      { x: 0, y: 1.95, z: 0, color: "#1f2937", width: 0.8, thickness: 0.08, depth: 0.8, blockShape: "cylinder" },
    ]
  },
  throne: {
    name: "Golden Throne",
    emoji: "👑",
    blocks: [
      // Base Platform
      { x: 0, y: 0, z: 0, color: "#f59e0b", width: 1.4, thickness: 0.3, depth: 1.4, curveness: 1 },
      // Seat Cushion
      { x: 0, y: 0.3, z: 0, color: "#B22222", width: 1.0, thickness: 0.25, depth: 1.0, curveness: 2 },
      // Armrests (Cylinders)
      { x: -0.6, y: 0.55, z: 0, color: "#f59e0b", width: 0.2, thickness: 0.35, depth: 0.9, blockShape: "cylinder" },
      { x: 0.6, y: 0.55, z: 0, color: "#f59e0b", width: 0.2, thickness: 0.35, depth: 0.9, blockShape: "cylinder" },
      // Backrest
      { x: 0, y: 1.1, z: -0.45, color: "#f59e0b", width: 1.2, thickness: 1.3, depth: 0.2 },
      // Crown Pyramids on Top
      { x: -0.4, y: 1.85, z: -0.45, color: "#f59e0b", width: 0.35, thickness: 0.35, depth: 0.2, blockShape: "pyramid" },
      { x: 0, y: 1.95, z: -0.45, color: "#f59e0b", width: 0.45, thickness: 0.45, depth: 0.2, blockShape: "pyramid" },
      { x: 0.4, y: 1.85, z: -0.45, color: "#f59e0b", width: 0.35, thickness: 0.35, depth: 0.2, blockShape: "pyramid" },
      // Velvet Center
      { x: 0, y: 1.2, z: -0.34, color: "#B22222", width: 0.8, thickness: 0.9, depth: 0.05 },
    ]
  }
};

/* ─── 3D Block Mesh in Studio ─── */
function StudioBlockMesh({
  block,
  isSelected,
  onSelect
}: {
  block: ProductBlock;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const bw = block.width || 1;
  const bh = block.thickness || 1;
  const bd = block.depth || 1;
  const rotY = (block.rotationY || 0) * (Math.PI / 180);

  // Position in studio (Y sits atop base)
  const posY = block.y + bh / 2;

  let geom: React.ReactNode = null;
  if (block.type === 'roof') {
    geom = <coneGeometry args={[0.71, bh, 4]} />;
  } else if (block.blockShape === 'wedge') {
    geom = <primitive object={getWedgeGeometry()} attach="geometry" />;
  } else if (block.blockShape === 'pyramid') {
    geom = <primitive object={getPyramidGeometry()} attach="geometry" />;
  } else if (block.blockShape === 'sphere') {
    geom = <primitive object={getSphereGeometry()} attach="geometry" />;
  } else if (block.blockShape === 'cylinder') {
    geom = <primitive object={getCylinderGeometry()} attach="geometry" />;
  } else if (block.blockShape === 'cone') {
    geom = <primitive object={getConeGeometry()} attach="geometry" />;
  } else if (block.blockShape === 'torus') {
    geom = <primitive object={getTorusGeometry()} attach="geometry" />;
  } else if (block.blockShape === 'dome') {
    geom = <primitive object={getDomeGeometry()} attach="geometry" />;
  } else if (block.curveness && block.curveness > 0) {
    geom = <primitive object={getCurvedGeometry(block.curveness)} attach="geometry" />;
  } else {
    geom = <boxGeometry args={[1, 1, 1]} />;
  }

  const isGlass = block.materialType === 'glass' || block.color === '#ADD8E6';

  return (
    <group position={[block.x, posY, block.z]} rotation={[0, rotY, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh scale={[bw, bh, bd]} castShadow receiveShadow>
        {geom}
        <meshStandardMaterial
          color={block.color || "#8B5A2B"}
          transparent={isGlass}
          opacity={isGlass ? 0.6 : 1}
          roughness={0.5}
        />
      </mesh>
      {isSelected && (
        <mesh scale={[bw + 0.06, bh + 0.06, bd + 0.06]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ec4899" wireframe />
        </mesh>
      )}
    </group>
  );
}

interface ProductDesignerModalProps {
  initialProductId?: string; // Present when editing an existing product!
  initialBlocks?: any[];
  initialName?: string;
  initialEmoji?: string;
  initialCost?: number;
  blockCost?: number;
  customColors?: string[];
  isConvertingFromWorld?: boolean;
  onSave: (product: CustomProductData, removeOriginalBlocks?: boolean) => void;
  onClose: () => void;
}

export function ProductDesignerModal({
  initialProductId,
  initialBlocks = [],
  initialName = "",
  initialEmoji = "📦",
  initialCost,
  blockCost = 50,
  customColors = [],
  isConvertingFromWorld = false,
  onSave,
  onClose,
}: ProductDesignerModalProps) {
  const isEditing = Boolean(initialProductId);

  // Convert initial blocks into internal blocks format
  const initialBlocksFormatted = useMemo(() => {
    if (initialBlocks.length === 0) {
      // Default single starter cube
      return [
        {
          id: `b_${Date.now()}_0`,
          x: 0,
          y: 0,
          z: 0,
          color: "#8B5A2B",
          width: 1,
          thickness: 1,
          depth: 1,
          blockShape: "box" as ShapeType,
          materialType: "color" as const,
          rotationY: 0,
          curveness: 0
        }
      ];
    }
    // Normalize coordinates so bottom-most block is at Y = 0 and centered on X/Z
    const minY = Math.min(...initialBlocks.map(b => b.y ?? 0));
    const minX = Math.min(...initialBlocks.map(b => b.x ?? 0));
    const maxX = Math.max(...initialBlocks.map(b => b.x ?? 0));
    const minZ = Math.min(...initialBlocks.map(b => b.z ?? 0));
    const maxZ = Math.max(...initialBlocks.map(b => b.z ?? 0));
    const cx = Math.round((minX + maxX) / 2);
    const cz = Math.round((minZ + maxZ) / 2);

    return initialBlocks.map((b, idx) => ({
      id: `b_${Date.now()}_${idx}`,
      x: Number(((b.x ?? 0) - cx).toFixed(2)),
      y: Number(((b.y ?? 0) - minY).toFixed(2)),
      z: Number(((b.z ?? 0) - cz).toFixed(2)),
      color: b.color || "#8B5A2B",
      type: b.type || "block",
      width: b.width ?? b.w ?? 1,
      thickness: b.thickness ?? b.h ?? 1,
      depth: b.depth ?? b.d ?? 1,
      curveness: b.curveness || 0,
      blockShape: (b.blockShape || "box") as ShapeType,
      materialType: b.materialType || (b.color === "#ADD8E6" ? "glass" : "color"),
      textureId: b.textureId || "",
      rotationY: b.rotationY ? Math.round((b.rotationY * 180) / Math.PI) : 0
    }));
  }, [initialBlocks]);

  const [blocks, setBlocks] = useState<ProductBlock[]>(initialBlocksFormatted);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(initialBlocksFormatted[0]?.id || "");
  const [productName, setProductName] = useState(initialName || (isEditing ? "Custom Product" : "My Custom Product"));
  const [productEmoji, setProductEmoji] = useState(initialEmoji || "📦");
  const [cost, setCost] = useState<number>(
    initialCost !== undefined ? initialCost : Math.max(0, initialBlocks.length * (blockCost || 50))
  );
  const [removeOriginals, setRemoveOriginals] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'transform' | 'shape' | 'material'>('transform');

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || blocks[0];

  // Helper to update selected block
  const updateSelectedBlock = (updates: Partial<ProductBlock>) => {
    if (!selectedBlock) return;
    setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, ...updates } : b));
  };

  // Add block
  const handleAddBlock = () => {
    const ref = selectedBlock || blocks[blocks.length - 1];
    const newY = ref ? Number((ref.y + (ref.thickness || 1)).toFixed(2)) : 0;
    const newBlock: ProductBlock = {
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: ref ? ref.x : 0,
      y: newY,
      z: ref ? ref.z : 0,
      color: ref ? ref.color : "#8B5A2B",
      width: 1,
      thickness: 1,
      depth: 1,
      blockShape: (ref?.blockShape || "box") as ShapeType,
      materialType: "color",
      rotationY: 0,
      curveness: 0
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  // Duplicate block
  const handleDuplicateBlock = () => {
    if (!selectedBlock) return;
    const clone: ProductBlock = {
      ...selectedBlock,
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: Number((selectedBlock.x + 0.5).toFixed(2)),
      z: Number((selectedBlock.z + 0.5).toFixed(2)),
    };
    setBlocks(prev => [...prev, clone]);
    setSelectedBlockId(clone.id);
  };

  // Delete block
  const handleDeleteBlock = (idToDelete: string) => {
    if (blocks.length <= 1) return; // Keep at least 1 block
    const remaining = blocks.filter(b => b.id !== idToDelete);
    setBlocks(remaining);
    if (selectedBlockId === idToDelete) {
      setSelectedBlockId(remaining[0]?.id || "");
    }
  };

  // Load template
  const handleLoadTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setProductName(t.name);
    setProductEmoji(t.emoji);
    const newBlocks: ProductBlock[] = t.blocks.map((b, idx) => ({
      ...b,
      id: `b_${Date.now()}_${idx}`
    }));
    setBlocks(newBlocks);
    setSelectedBlockId(newBlocks[0].id);
  };

  // Handle Save
  const handleSaveProduct = () => {
    if (blocks.length === 0) return;
    const trimmedName = productName.trim() || (isEditing ? "Updated Product" : "Custom Product");

    // Re-normalize coordinates so bottom Y is 0 and centered on X/Z
    const minY = Math.min(...blocks.map(b => b.y));
    const minX = Math.min(...blocks.map(b => b.x));
    const maxX = Math.max(...blocks.map(b => b.x));
    const minZ = Math.min(...blocks.map(b => b.z));
    const maxZ = Math.max(...blocks.map(b => b.z));

    const cx = Number(((minX + maxX) / 2).toFixed(2));
    const cz = Number(((minZ + maxZ) / 2).toFixed(2));

    const normalizedBlocks = blocks.map(b => ({
      x: Number((b.x - cx).toFixed(2)),
      y: Number((b.y - minY).toFixed(2)),
      z: Number((b.z - cz).toFixed(2)),
      color: b.color || "#8B5A2B",
      type: b.type || 'block',
      width: b.width || 1,
      thickness: b.thickness || 1,
      depth: b.depth || 1,
      curveness: b.curveness || 0,
      blockShape: b.blockShape || 'box',
      materialType: b.materialType || 'color',
      textureId: b.textureId || '',
      rotationY: b.rotationY ? (b.rotationY * Math.PI) / 180 : 0
    }));

    const finalProduct: CustomProductData = {
      id: initialProductId || `custom_prod_${Date.now()}`,
      name: trimmedName,
      emoji: productEmoji || "📦",
      cost: Math.max(0, cost),
      refundOnErase: Math.floor(Math.max(0, cost) * 0.5),
      width: Number((maxX - minX + 1).toFixed(1)),
      height: Number((Math.max(...blocks.map(b => b.y + (b.thickness || 1))) - minY).toFixed(1)),
      depth: Number((maxZ - minZ + 1).toFixed(1)),
      blocks: normalizedBlocks
    };

    onSave(finalProduct, isConvertingFromWorld ? removeOriginals : false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-hidden animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-white/40 flex flex-col w-full max-w-5xl h-[92vh] max-h-[820px] overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-amber-50">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-1.5 bg-amber-100 rounded-2xl shadow-inner border border-amber-200">
              {productEmoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                  <span>{isEditing ? `Edit Item: ${productName}` : "Product Studio"}</span>
                </h2>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm text-white ${
                  isEditing ? 'bg-amber-500' : 'bg-sky-500'
                }`}>
                  {isEditing ? "Editing Item" : `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                {isEditing 
                  ? "Modify the shapes, blocks, and colors of this product — placed items will update automatically!"
                  : "Design custom items using spheres, cylinders, boxes, and more, then use them anytime in your world"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: 3D Viewport */}
          <div className="flex-1 bg-gradient-to-b from-sky-100/60 to-emerald-50/50 relative flex flex-col min-h-[300px]">
            {/* Quick 3D controls hint */}
            <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-white text-[11px] font-bold text-slate-600 flex items-center gap-2 pointer-events-none">
              <span>🖱️ Drag to rotate &bull; Scroll to zoom</span>
            </div>

            {/* Quick Preset Templates */}
            <div className="absolute top-3 right-3 z-10 flex gap-1.5 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white max-w-[280px] sm:max-w-none overflow-x-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider self-center px-1">Templates:</span>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => handleLoadTemplate(key)}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer border border-sky-200/60 flex items-center gap-1 shrink-0"
                  title={`Load ${t.name}`}
                >
                  <span>{t.emoji}</span>
                  <span className="hidden sm:inline">{key}</span>
                </button>
              ))}
            </div>

            {/* Canvas */}
            <div className="w-full h-full cursor-grab active:cursor-grabbing">
              <Canvas shadows camera={{ position: [2.5, 3, 3.5], fov: 45 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 10, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
                <directionalLight position={[-5, 5, -5]} intensity={0.5} />
                
                {/* Turntable Floor Grid */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={() => {}}>
                  <planeGeometry args={[10, 10]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
                  <gridHelper args={[10, 10, "#94a3b8", "#cbd5e1"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} />
                </mesh>

                {/* Blocks */}
                {blocks.map((b) => (
                  <StudioBlockMesh
                    key={b.id}
                    block={b}
                    isSelected={b.id === selectedBlockId}
                    onSelect={() => setSelectedBlockId(b.id)}
                  />
                ))}

                <OrbitControls makeDefault minDistance={1.5} maxDistance={12} maxPolarAngle={Math.PI / 2 + 0.05} />
              </Canvas>
            </div>

            {/* Bottom Bar inside 3D: Block list thumbnails */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-2 overflow-x-auto p-2 bg-white/85 backdrop-blur-md rounded-2xl shadow-lg border border-white">
              <button
                onClick={handleAddBlock}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition-transform active:scale-95 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Block
              </button>

              <div className="h-6 w-px bg-slate-200 shrink-0" />

              <div className="flex gap-2 overflow-x-auto py-0.5">
                {blocks.map((b, idx) => {
                  const isSel = b.id === selectedBlockId;
                  const shapeDef = SHAPE_OPTIONS.find(s => s.id === b.blockShape);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBlockId(b.id)}
                      className={`relative px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isSel
                          ? "bg-sky-500 text-white shadow-md scale-105"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span className="text-sm">{shapeDef?.emoji || "📦"}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: b.color || "#8B5A2B" }}
                      />
                      <span>Block {idx + 1}</span>
                      {blocks.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBlock(b.id);
                          }}
                          className="ml-1 text-slate-400 hover:text-rose-500 rounded-full p-0.5"
                          title="Delete Block"
                        >
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Inspector & Product Info */}
          <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-auto md:h-full overflow-hidden">
            
            {/* Top: Product Name, Emoji, Cost */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                {/* Emoji Select dropdown / popover */}
                <div className="relative group shrink-0">
                  <input
                    type="text"
                    value={productEmoji}
                    onChange={(e) => setProductEmoji(e.target.value.slice(-2) || "📦")}
                    className="w-12 h-12 text-center text-2xl bg-white border-2 border-amber-300 rounded-2xl shadow-sm cursor-pointer font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    title="Click to type emoji"
                  />
                  {/* Preset emojis flyout */}
                  <div className="hidden group-hover:flex group-focus-within:flex absolute top-full left-0 mt-1 z-30 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 w-56 flex-wrap gap-1">
                    {PRESET_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setProductEmoji(em)}
                        className="text-xl p-1.5 hover:bg-amber-100 rounded-lg transition-transform hover:scale-125 cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Gamer Chair"
                    className="w-full text-sm font-extrabold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Point Cost to Place */}
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Placement Cost</span>
                  <span className="text-xs text-slate-400 font-semibold">Points deducted when placed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={cost}
                    onChange={(e) => setCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-right text-sm font-black text-amber-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs font-black text-amber-500">pts</span>
                </div>
              </div>

              {/* World conversion checkbox if from world */}
              {isConvertingFromWorld && (
                <label className="flex items-center gap-2 cursor-pointer bg-sky-50 p-2 rounded-xl border border-sky-100">
                  <input
                    type="checkbox"
                    checked={removeOriginals}
                    onChange={(e) => setRemoveOriginals(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-sky-800">
                    Replace original blocks in world with this item
                  </span>
                </label>
              )}
            </div>

            {/* Block Inspector Tabs */}
            {selectedBlock ? (
              <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-500" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Selected Block ({SHAPE_OPTIONS.find(s => s.id === selectedBlock.blockShape)?.name || "Box"})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleDuplicateBlock}
                      className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                      title="Duplicate Block"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {blocks.length > 1 && (
                      <button
                        onClick={() => handleDeleteBlock(selectedBlock.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Delete Block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtabs: Transform, Shape, Material */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('transform')}
                    className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'transform' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Size & Pos
                  </button>
                  <button
                    onClick={() => setActiveTab('shape')}
                    className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'shape' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Shapes
                  </button>
                  <button
                    onClick={() => setActiveTab('material')}
                    className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'material' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Material
                  </button>
                </div>

                {/* Tab: Transform */}
                {activeTab === 'transform' && (
                  <div className="flex flex-col gap-3">
                    {/* Position Sliders */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Position</span>
                      
                      {/* X */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500 w-4">X</span>
                        <input
                          type="range"
                          min={-3}
                          max={3}
                          step={0.1}
                          value={selectedBlock.x}
                          onChange={(e) => updateSelectedBlock({ x: parseFloat(e.target.value) })}
                          className="flex-1 accent-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{selectedBlock.x.toFixed(1)}</span>
                      </div>

                      {/* Y */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500 w-4">Y</span>
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={0.1}
                          value={selectedBlock.y}
                          onChange={(e) => updateSelectedBlock({ y: parseFloat(e.target.value) })}
                          className="flex-1 accent-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{selectedBlock.y.toFixed(1)}</span>
                      </div>

                      {/* Z */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500 w-4">Z</span>
                        <input
                          type="range"
                          min={-3}
                          max={3}
                          step={0.1}
                          value={selectedBlock.z}
                          onChange={(e) => updateSelectedBlock({ z: parseFloat(e.target.value) })}
                          className="flex-1 accent-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{selectedBlock.z.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dimensions</span>
                      
                      {/* Width */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12">Width</span>
                        <input
                          type="range"
                          min={0.1}
                          max={3}
                          step={0.05}
                          value={selectedBlock.width || 1}
                          onChange={(e) => updateSelectedBlock({ width: parseFloat(e.target.value) })}
                          className="flex-1 accent-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{(selectedBlock.width || 1).toFixed(2)}</span>
                      </div>

                      {/* Height (Thickness) */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12">Height</span>
                        <input
                          type="range"
                          min={0.1}
                          max={3}
                          step={0.05}
                          value={selectedBlock.thickness || 1}
                          onChange={(e) => updateSelectedBlock({ thickness: parseFloat(e.target.value) })}
                          className="flex-1 accent-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{(selectedBlock.thickness || 1).toFixed(2)}</span>
                      </div>

                      {/* Depth */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-12">Depth</span>
                        <input
                          type="range"
                          min={0.1}
                          max={3}
                          step={0.05}
                          value={selectedBlock.depth || 1}
                          onChange={(e) => updateSelectedBlock({ depth: parseFloat(e.target.value) })}
                          className="flex-1 accent-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{(selectedBlock.depth || 1).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Rotation Y */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-purple-500" /> Rotation
                      </span>
                      <div className="flex gap-1">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => updateSelectedBlock({ rotationY: deg })}
                            className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                              (selectedBlock.rotationY || 0) === deg
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Shapes */}
                {activeTab === 'shape' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">3D Shape</span>
                      <span className="text-xs font-bold text-sky-600">
                        {SHAPE_OPTIONS.find(s => s.id === selectedBlock.blockShape)?.name || "Box"}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {SHAPE_OPTIONS.map((shape) => {
                        const isCurrent = (!selectedBlock.blockShape && shape.id === 'box') || selectedBlock.blockShape === shape.id;
                        return (
                          <button
                            key={shape.id}
                            onClick={() => updateSelectedBlock({ blockShape: shape.id, type: "block" })}
                            className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 font-bold text-xs cursor-pointer transition-all ${
                              isCurrent
                                ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm scale-105"
                                : "border-slate-200 hover:bg-slate-50 text-slate-600"
                            }`}
                            title={shape.desc}
                          >
                            <span className="text-xl leading-none">{shape.emoji}</span>
                            <span className="text-[10px] font-black leading-tight text-center">{shape.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Corner Curveness (available for Box) */}
                    {(!selectedBlock.blockShape || selectedBlock.blockShape === 'box') && (
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2 mt-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                          <span>Corner Bevel / Curveness</span>
                          <span className="font-black text-sky-600">{selectedBlock.curveness || 0}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={4}
                          step={1}
                          value={selectedBlock.curveness || 0}
                          onChange={(e) => updateSelectedBlock({ curveness: parseInt(e.target.value) })}
                          className="accent-sky-500"
                        />
                        <span className="text-[10px] text-slate-400">
                          0 = sharp box, 4 = rounded corners
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Material */}
                {activeTab === 'material' && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Material Type</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => updateSelectedBlock({ materialType: "color" })}
                        className={`py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                          selectedBlock.materialType === "color" || !selectedBlock.materialType
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        Color
                      </button>
                      <button
                        onClick={() => updateSelectedBlock({ materialType: "texture", textureId: selectedBlock.textureId || "wood" })}
                        className={`py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                          selectedBlock.materialType === "texture"
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        Texture
                      </button>
                      <button
                        onClick={() => updateSelectedBlock({ materialType: "glass", color: "#ADD8E6" })}
                        className={`py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                          selectedBlock.materialType === "glass"
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        Glass
                      </button>
                    </div>

                    {/* Colors Palette */}
                    {(selectedBlock.materialType === "color" || !selectedBlock.materialType) && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Palette</span>
                        <div className="flex flex-wrap gap-2">
                          {BASE_COLORS.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => updateSelectedBlock({ color: c.color })}
                              className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 cursor-pointer ${
                                selectedBlock.color === c.color ? "border-sky-500 scale-110 shadow-md" : "border-transparent"
                              }`}
                              style={{ backgroundColor: c.color }}
                              title={c.name}
                            />
                          ))}

                          {customColors.map((color, idx) => (
                            <button
                              key={`cust-${idx}`}
                              onClick={() => updateSelectedBlock({ color })}
                              className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 cursor-pointer ${
                                selectedBlock.color === color ? "border-sky-500 scale-110 shadow-md" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>

                        {/* Custom Color Input */}
                        <div className="flex items-center gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <input
                            type="color"
                            value={selectedBlock.color || "#8B5A2B"}
                            onChange={(e) => updateSelectedBlock({ color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                          <span className="text-xs font-bold text-slate-600">Custom Color:</span>
                          <span className="text-xs font-mono font-black text-slate-800 uppercase">{selectedBlock.color || "#8B5A2B"}</span>
                        </div>
                      </div>
                    )}

                    {/* Textures */}
                    {selectedBlock.materialType === "texture" && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Texture Pattern</span>
                        <div className="grid grid-cols-2 gap-2">
                          {AVAILABLE_TEXTURES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => updateSelectedBlock({ textureId: t.id })}
                              className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                selectedBlock.textureId === t.id
                                  ? "border-sky-500 bg-sky-50 text-sky-800"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
                              }`}
                            >
                              <div
                                className="w-6 h-6 rounded-lg bg-cover border border-black/10 shrink-0"
                                style={{ backgroundImage: `url(${t.url})` }}
                              />
                              <span>{t.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Glass Options */}
                    {selectedBlock.materialType === "glass" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateSelectedBlock({ color: "#ADD8E6" })}
                          className={`flex-1 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer ${
                            selectedBlock.color === "#ADD8E6" ? "border-sky-500 bg-sky-100/60" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          Clear Glass
                        </button>
                        <button
                          onClick={() => updateSelectedBlock({ color: "#1f2937" })}
                          className={`flex-1 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer ${
                            selectedBlock.color === "#1f2937" ? "border-sky-500 bg-slate-200" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          Tinted Glass
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400 p-6 text-center">
                Click "+ Add Block" to begin designing your product
              </div>
            )}

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveProduct}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer ${
                  isEditing
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25"
                }`}
              >
                {isEditing ? <Pencil className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isEditing ? "Update Item" : "Save as Item"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
