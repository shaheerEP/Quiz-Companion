import { PlacedObject } from "@/app/student/builder/page";

function generateHouse(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  const color = "#B22222"; // Brick
  const glass = "#ADD8E6"; // Glass
  const wood = "#8B5A2B"; // Wood
  
  // Floor
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      objects.push({ x, y: 0, z, color: wood, type: "block" });
    }
  }

  // Walls
  for (let y = 1; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      if (x === 0 && y <= 2) {
        // Front door space
        continue; 
      }
      // Front wall
      objects.push({ x, y, z: 3, color: (y === 2 && x !== 0) ? glass : color, type: "block" });
      // Back wall
      objects.push({ x, y, z: -3, color: (y === 2) ? glass : color, type: "block" });
    }
    for (let z = -2; z <= 2; z++) {
      // Left wall
      objects.push({ x: -3, y, z, color: (y === 2) ? glass : color, type: "block" });
      // Right wall
      objects.push({ x: 3, y, z, color: (y === 2) ? glass : color, type: "block" });
    }
  }

  // Large Roof
  objects.push({ x: 0, y: 4, z: 0, color: "#1f2937", type: "large-roof", w: 9, d: 9, h: 1 });

  // Interior Items
  objects.push({ x: -1, y: 1, z: 1, color: "", type: "item", itemId: "bed" });
  objects.push({ x: 1, y: 1, z: -1, color: "", type: "item", itemId: "table" });
  objects.push({ x: 2, y: 1, z: -2, color: "", type: "item", itemId: "lamp" });
  objects.push({ x: -2, y: 1, z: -2, color: "", type: "item", itemId: "chest" });
  
  // Cat on bed
  objects.push({ x: -1, y: 2, z: 1, color: "", type: "item", itemId: "cat" });

  // Dog outside
  objects.push({ x: -2, y: 0, z: 5, color: "", type: "item", itemId: "dog" });

  return objects;
}

function generateFarm(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  const wood = "#8B5A2B"; 
  
  // Fences around a large area
  for (let x = -6; x <= 6; x += 2) {
    objects.push({ x, y: 0, z: -6, color: "", type: "item", itemId: "fence" });
    objects.push({ x, y: 0, z: 6, color: "", type: "item", itemId: "fence" });
  }
  for (let z = -4; z <= 4; z += 2) {
    objects.push({ x: -6, y: 0, z, color: "", type: "item", itemId: "fence" });
    objects.push({ x: 6, y: 0, z, color: "", type: "item", itemId: "fence" });
  }

  // Small Barn structure
  for (let y = 0; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      objects.push({ x, y, z: -5, color: wood, type: "block" });
    }
    for (let z = -4; z <= -2; z++) {
      objects.push({ x: -2, y, z, color: wood, type: "block" });
      objects.push({ x: 2, y, z, color: wood, type: "block" });
    }
  }
  objects.push({ x: 0, y: 3, z: -3.5, color: "#ef4444", type: "large-roof", w: 7, d: 6, h: 1 });

  // Animals inside fence
  objects.push({ x: -4, y: 0, z: 2, color: "", type: "item", itemId: "cow" });
  objects.push({ x: 0, y: 0, z: 1, color: "", type: "item", itemId: "horse" });
  objects.push({ x: 3, y: 0, z: 4, color: "", type: "item", itemId: "pig" });
  objects.push({ x: 2, y: 0, z: 0, color: "", type: "item", itemId: "goat" });
  objects.push({ x: -2, y: 0, z: 3, color: "", type: "item", itemId: "chicken" });
  objects.push({ x: 4, y: 0, z: 2, color: "", type: "item", itemId: "chicken" });

  // Water trough
  objects.push({ x: -4, y: 0, z: -2, color: "#ADD8E6", type: "block" });
  objects.push({ x: -3, y: 0, z: -2, color: "#ADD8E6", type: "block" });

  return objects;
}

function generatePark(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  const stone = "#808080";
  
  // Central path
  for (let z = -8; z <= 8; z++) {
    objects.push({ x: -1, y: 0, z, color: stone, type: "block" });
    objects.push({ x: 0, y: 0, z, color: stone, type: "block" });
    objects.push({ x: 1, y: 0, z, color: stone, type: "block" });
  }

  // Cross path
  for (let x = -8; x <= 8; x++) {
    objects.push({ x, y: 0, z: 0, color: stone, type: "block" });
  }

  // Trees & Bushes
  const features = [
    {x: -4, z: -4, type: 'tree'}, {x: 4, z: -4, type: 'tree'}, 
    {x: -5, z: 5, type: 'tree'}, {x: 5, z: 6, type: 'tree'},
    {x: -3, z: -3, type: 'bush'}, {x: 3, z: -5, type: 'bush'},
    {x: -6, z: 2, type: 'bush'}, {x: 4, z: 3, type: 'bush'}
  ];

  for (const f of features) {
    objects.push({ x: f.x, y: 0, z: f.z, color: "", type: "item", itemId: f.type });
  }

  // Benches along the path
  objects.push({ x: -2, y: 0, z: -2, color: "", type: "item", itemId: "bench" });
  objects.push({ x: 2, y: 0, z: 2, color: "", type: "item", itemId: "bench" });

  // Rocks
  objects.push({ x: -5, y: 0, z: -6, color: "", type: "item", itemId: "rock" });
  objects.push({ x: 6, y: 0, z: 2, color: "", type: "item", itemId: "rock" });

  // Animals
  objects.push({ x: -2, y: 0, z: 6, color: "", type: "item", itemId: "dog" });
  objects.push({ x: 3, y: 0, z: -2, color: "", type: "item", itemId: "cat" });

  // A statue in the middle
  objects.push({ x: 0, y: 1, z: 0, color: "#eab308", type: "block" });
  objects.push({ x: 0, y: 2, z: 0, color: "#eab308", type: "block" });
  objects.push({ x: 0, y: 3, z: 0, color: "", type: "item", itemId: "cat" });

  return objects;
}

export const EXAMPLE_WORLDS = [
  { id: 'house', name: 'Cozy House', emoji: '🏠', objects: generateHouse() },
  { id: 'farm', name: 'Farm & Zoo', emoji: '🐄', objects: generateFarm() },
  { id: 'park', name: 'City Park', emoji: '🌳', objects: generatePark() },
];
