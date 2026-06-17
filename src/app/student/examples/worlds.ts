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
    objects.push({ x: -6, y: 0, z, color: "", type: "item", itemId: "fence-side" });
    objects.push({ x: 6, y: 0, z, color: "", type: "item", itemId: "fence-side" });
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

function generateMansion(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  const stone = "#D1D5DB"; // Light gray concrete
  const glass = "#ADD8E6"; // Glass
  const darkStone = "#4B5563"; // Dark gray
  
  // Base footprint (12x12)
  for (let x = -6; x <= 6; x++) {
    for (let z = -6; z <= 6; z++) {
      objects.push({ x, y: 0, z, color: stone, type: "block" });
    }
  }

  // 1st Floor Walls (Lots of glass)
  for (let y = 1; y <= 3; y++) {
    for (let x = -5; x <= 5; x++) {
      if (x === 0 && y <= 2) continue; // Door
      // Front (mostly glass)
      objects.push({ x, y, z: 5, color: y === 1 || y === 3 ? darkStone : glass, type: "block" });
      // Back
      objects.push({ x, y, z: -5, color: darkStone, type: "block" });
    }
    for (let z = -4; z <= 4; z++) {
      // Left side glass
      objects.push({ x: -5, y, z, color: glass, type: "block" });
      // Right side solid
      objects.push({ x: 5, y, z, color: darkStone, type: "block" });
    }
  }

  // 1st Floor ceiling
  objects.push({ x: 0, y: 4, z: 0, color: stone, type: "large-roof", w: 11, d: 11, h: 1 });

  // 2nd Floor (Smaller footprint)
  for (let y = 5; y <= 7; y++) {
    for (let x = -3; x <= 5; x++) {
      objects.push({ x, y, z: 3, color: glass, type: "block" }); // Front balcony
      objects.push({ x, y, z: -5, color: darkStone, type: "block" }); // Back wall
    }
    for (let z = -4; z <= 2; z++) {
      objects.push({ x: -3, y, z, color: darkStone, type: "block" }); // Left wall
      objects.push({ x: 5, y, z, color: glass, type: "block" }); // Right wall
    }
  }

  // 2nd Floor roof
  objects.push({ x: 1, y: 8, z: -1, color: darkStone, type: "large-roof", w: 9, d: 9, h: 1 });

  // Balcony pool
  objects.push({ x: -2, y: 5, z: 4, color: "#3b82f6", type: "block" });
  objects.push({ x: -1, y: 5, z: 4, color: "#3b82f6", type: "block" });

  // Garden (Left Side)
  objects.push({ x: -8, y: 0, z: 2, color: "", type: "item", itemId: "tree" });
  objects.push({ x: -8, y: 0, z: -2, color: "", type: "item", itemId: "tree" });
  objects.push({ x: -7, y: 0, z: 0, color: "", type: "item", itemId: "bush" });
  objects.push({ x: -9, y: 0, z: 4, color: "", type: "item", itemId: "bench" });
  objects.push({ x: -8, y: 0, z: 5, color: "", type: "item", itemId: "cat" });

  // Farm (Right Side)
  for (let z = -4; z <= 4; z += 2) {
    objects.push({ x: 8, y: 0, z, color: "", type: "item", itemId: "fence-side" });
    objects.push({ x: 12, y: 0, z, color: "", type: "item", itemId: "fence-side" });
  }
  for (let x = 8; x <= 12; x += 2) {
    objects.push({ x, y: 0, z: -4, color: "", type: "item", itemId: "fence" });
    objects.push({ x, y: 0, z: 4, color: "", type: "item", itemId: "fence" });
  }
  objects.push({ x: 10, y: 0, z: 0, color: "", type: "item", itemId: "cow" });
  objects.push({ x: 9, y: 0, z: 2, color: "", type: "item", itemId: "horse" });
  objects.push({ x: 11, y: 0, z: -2, color: "", type: "item", itemId: "pig" });

  // Front pathway
  for (let z = 7; z <= 10; z++) {
    objects.push({ x: 0, y: 0, z, color: darkStone, type: "block" });
    objects.push({ x: -1, y: 0, z, color: darkStone, type: "block" });
    objects.push({ x: 1, y: 0, z, color: darkStone, type: "block" });
  }

  // Interior 1st floor
  objects.push({ x: -3, y: 1, z: 0, color: "", type: "item", itemId: "table" });
  objects.push({ x: 3, y: 1, z: 2, color: "", type: "item", itemId: "lamp" });

  // Interior 2nd floor
  objects.push({ x: 1, y: 5, z: 0, color: "", type: "item", itemId: "bed" });
  objects.push({ x: 3, y: 5, z: -3, color: "", type: "item", itemId: "chest" });

  // --- CITY EXPANSION --- //

  // Main Road (z: 11 to 14)
  const asphalt = "#1f2937";
  const roadLine = "#facc15";
  for (let x = -15; x <= 15; x++) {
    for (let z = 11; z <= 14; z++) {
      let c = asphalt;
      if (z === 12 && x % 3 === 0) c = roadLine; // dashed yellow line
      objects.push({ x, y: 0, z, color: c, type: "block" });
    }
  }

  // Driveway & Parked Car
  for (let z = 7; z <= 10; z++) {
    for (let x = -5; x <= -3; x++) {
      objects.push({ x, y: 0, z, color: stone, type: "block" });
    }
  }
  // Car (Red blocks with glass windows)
  const carColor = "#ef4444";
  objects.push({ x: -4, y: 1, z: 8, color: carColor, type: "block" });
  objects.push({ x: -4, y: 1, z: 9, color: carColor, type: "block" });
  objects.push({ x: -4, y: 2, z: 8, color: glass, type: "block" });

  // Streetlights
  const lightColors = [stone, stone, "#fef08a"];
  [-12, -4, 4, 12].forEach(lx => {
    lightColors.forEach((color, i) => {
      objects.push({ x: lx, y: i+1, z: 10, color, type: "block" });
    });
  });

  // Fountain in Garden
  objects.push({ x: -12, y: 0, z: 0, color: stone, type: "block" });
  objects.push({ x: -13, y: 0, z: 0, color: stone, type: "block" });
  objects.push({ x: -11, y: 0, z: 0, color: stone, type: "block" });
  objects.push({ x: -12, y: 0, z: -1, color: stone, type: "block" });
  objects.push({ x: -12, y: 0, z: 1, color: stone, type: "block" });
  objects.push({ x: -12, y: 1, z: 0, color: "#3b82f6", type: "block" }); // water
  objects.push({ x: -12, y: 2, z: 0, color: "#3b82f6", type: "block" });

  // Forest behind the mansion (z: -15 to -8)
  for (let i = 0; i < 15; i++) {
    objects.push({ 
      x: Math.floor(Math.random() * 30) - 15, 
      y: 0, 
      z: Math.floor(Math.random() * 7) - 15, 
      color: "", type: "item", itemId: "tree" 
    });
  }
  
  for (let i = 0; i < 10; i++) {
    objects.push({ 
      x: Math.floor(Math.random() * 30) - 15, 
      y: 0, 
      z: Math.floor(Math.random() * 7) - 15, 
      color: "", type: "item", itemId: "bush" 
    });
  }

  // Neighboring Modern Art Gallery (x: -15 to -10, z: 5 to 9)
  const galleryWall = "#f3f4f6";
  for(let x=-15; x<=-10; x++) {
    for(let z=5; z<=9; z++) {
      objects.push({ x, y: 0, z, color: galleryWall, type: "block" });
    }
  }
  objects.push({ x: -12.5, y: 4, z: 7, color: "#eab308", type: "large-roof", w: 6, d: 5, h: 1 });
  for(let y=1; y<=3; y++) {
    objects.push({ x: -12, y, z: 7, color: glass, type: "block" });
    objects.push({ x: -13, y, z: 7, color: glass, type: "block" });
  }

  // More animals around
  objects.push({ x: -2, y: 0, z: 12, color: "", type: "item", itemId: "dog" }); // Dog crossing road
  objects.push({ x: 14, y: 0, z: 8, color: "", type: "item", itemId: "cat" });
  objects.push({ x: -14, y: 0, z: -2, color: "", type: "item", itemId: "horse" });

  return objects;
}

export const EXAMPLE_WORLDS = [
  { id: 'house', name: 'Cozy House', emoji: '🏠', objects: generateHouse() },
  { id: 'farm', name: 'Farm & Zoo', emoji: '🐄', objects: generateFarm() },
  { id: 'park', name: 'City Park', emoji: '🌳', objects: generatePark() },
  { id: 'mansion', name: 'Modern Mansion', emoji: '🏰', objects: generateMansion() },
];
