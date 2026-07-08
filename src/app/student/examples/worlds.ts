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
  objects.push({ x: -1, y: 1, z: 1, color: "", type: "item", itemId: "bed", rotationY: Math.PI / 2 });
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
    objects.push({ x: -6, y: 0, z, color: "", type: "item", itemId: "fence", rotationY: Math.PI / 2 });
    objects.push({ x: 6, y: 0, z, color: "", type: "item", itemId: "fence", rotationY: Math.PI / 2 });
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
  objects.push({ x: -4, y: 0, z: 2, color: "", type: "item", itemId: "cow", rotationY: Math.PI / 4 });
  objects.push({ x: 0, y: 0, z: 1, color: "", type: "item", itemId: "horse", rotationY: -Math.PI / 6 });
  objects.push({ x: 3, y: 0, z: 4, color: "", type: "item", itemId: "pig", rotationY: Math.PI / 2 });
  objects.push({ x: 2, y: 0, z: 0, color: "", type: "item", itemId: "goat", rotationY: Math.PI });
  objects.push({ x: -2, y: 0, z: 3, color: "", type: "item", itemId: "chicken", rotationY: -Math.PI / 2 });
  objects.push({ x: 4, y: 0, z: 2, color: "", type: "item", itemId: "chicken", rotationY: Math.PI / 3 });

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
  objects.push({ x: -2, y: 0, z: -2, color: "", type: "item", itemId: "bench", rotationY: Math.PI / 2 });
  objects.push({ x: 2, y: 0, z: 2, color: "", type: "item", itemId: "bench", rotationY: -Math.PI / 2 });

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
  for (let x = -11; x <= -5; x++) {
    for (let z = -4; z <= 6; z++) {
      if (Math.random() > 0.3) {
        objects.push({ x, y: 0, z, color: "", type: "item", itemId: "grass_field" });
      }
    }
  }
  objects.push({ x: -8, y: 0, z: 2, color: "", type: "item", itemId: "tree" });
  objects.push({ x: -8, y: 0, z: -2, color: "", type: "item", itemId: "tree" });
  objects.push({ x: -7, y: 0, z: 0, color: "", type: "item", itemId: "bush" });
  objects.push({ x: -9, y: 0, z: 4, color: "", type: "item", itemId: "bench" });
  objects.push({ x: -8, y: 0, z: 5, color: "", type: "item", itemId: "cat" });

  // Farm (Right Side)
  for (let z = -4; z <= 4; z += 2) {
    objects.push({ x: 8, y: 0, z, color: "", type: "item", itemId: "fence", rotationY: Math.PI / 2 });
    objects.push({ x: 12, y: 0, z, color: "", type: "item", itemId: "fence", rotationY: Math.PI / 2 });
  }
  for (let x = 8; x <= 12; x += 2) {
    objects.push({ x, y: 0, z: -4, color: "", type: "item", itemId: "fence" });
    objects.push({ x, y: 0, z: 4, color: "", type: "item", itemId: "fence" });
  }
  objects.push({ x: 10, y: 0, z: 0, color: "", type: "item", itemId: "cow", rotationY: Math.PI / 4 });
  objects.push({ x: 9, y: 0, z: 2, color: "", type: "item", itemId: "horse", rotationY: -Math.PI / 3 });
  objects.push({ x: 11, y: 0, z: -2, color: "", type: "item", itemId: "pig", rotationY: Math.PI / 6 });

  // Front pathway
  for (let z = 7; z <= 10; z++) {
    objects.push({ x: 0, y: 0, z, color: darkStone, type: "block" });
    objects.push({ x: -1, y: 0, z, color: darkStone, type: "block" });
    objects.push({ x: 1, y: 0, z, color: darkStone, type: "block" });
  }

  // Interior 1st floor
  objects.push({ x: -3, y: 1, z: 0, color: "", type: "item", itemId: "table" });
  objects.push({ x: -3, y: 1, z: -1, color: "", type: "item", itemId: "stool" });
  objects.push({ x: -3, y: 1, z: 1, color: "", type: "item", itemId: "stool" });
  objects.push({ x: 3, y: 1, z: 2, color: "", type: "item", itemId: "lamp" });
  objects.push({ x: 2, y: 1, z: -1, color: "", type: "item", itemId: "sofa", rotationY: -Math.PI / 2 });

  // Interior 2nd floor
  objects.push({ x: 1, y: 5, z: 0, color: "", type: "item", itemId: "bed", rotationY: Math.PI / 2 });
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

  // Coffee Shop (x: 13 to 15, z: 6 to 9) right of mansion
  const cafeColor = "#fcd34d";
  for(let y=0; y<=2; y++) {
    for(let z=6; z<=9; z++) {
      objects.push({ x: 13, y, z, color: cafeColor, type: "block" });
      objects.push({ x: 15, y, z, color: cafeColor, type: "block" });
    }
    objects.push({ x: 14, y, z: 6, color: glass, type: "block" });
    objects.push({ x: 14, y, z: 9, color: cafeColor, type: "block" });
  }
  objects.push({ x: 14, y: 3, z: 7.5, color: "#ef4444", type: "large-roof", w: 3, d: 4, h: 1 });
  objects.push({ x: 14, y: 0, z: 7, color: "", type: "item", itemId: "table" });

  // --- ACROSS THE STREET (z: 15 to 22) --- //

  // 1. Skyscraper (x: -14 to -9, z: 16 to 21)
  const skyWall = "#9ca3af";
  const skyGlass = "#38bdf8";
  for(let x=-14; x<=-9; x++) {
    for(let z=16; z<=21; z++) {
      objects.push({ x, y: 0, z, color: skyWall, type: "block" });
    }
  }
  for(let y=1; y<=12; y++) {
    for(let x=-13; x<=-10; x++) {
      for(let z=17; z<=20; z++) {
        // Hollow skyscraper shell with glass front/back
        if (x === -13 || x === -10) objects.push({ x, y, z, color: skyWall, type: "block" });
        else if (z === 17 || z === 20) objects.push({ x, y, z, color: skyGlass, type: "block" });
      }
    }
  }
  objects.push({ x: -11.5, y: 13, z: 18.5, color: "#1f2937", type: "large-roof", w: 4, d: 4, h: 1 });

  // 2. City Park Plaza (x: -5 to 2, z: 16 to 21)
  const plazaStone = "#e5e7eb";
  for(let x=-5; x<=2; x++) {
    for(let z=16; z<=21; z++) {
      objects.push({ x, y: 0, z, color: ((x+z)%2===0) ? plazaStone : stone, type: "block" });
    }
  }
  objects.push({ x: -1, y: 0, z: 18, color: "", type: "item", itemId: "tree" });
  objects.push({ x: -4, y: 0, z: 17, color: "", type: "item", itemId: "bench" });
  objects.push({ x: 1, y: 0, z: 20, color: "", type: "item", itemId: "bench", rotationY: Math.PI });

  // 3. Cozy House (x: 5 to 11, z: 16 to 21)
  const houseBrick = "#b91c1c";
  for(let x=6; x<=10; x++) {
    for(let z=17; z<=20; z++) {
      objects.push({ x, y: 0, z, color: "#8B5A2B", type: "block" });
    }
  }
  for(let y=1; y<=2; y++) {
    for(let x=6; x<=10; x++) {
      objects.push({ x, y, z: 17, color: (x===8 && y===1) ? glass : houseBrick, type: "block" }); // Front
      objects.push({ x, y, z: 20, color: houseBrick, type: "block" }); // Back
    }
    for(let z=18; z<=19; z++) {
      objects.push({ x: 6, y, z, color: houseBrick, type: "block" }); // Left
      objects.push({ x: 10, y, z, color: houseBrick, type: "block" }); // Right
    }
  }
  objects.push({ x: 8, y: 3, z: 18.5, color: "#1f2937", type: "large-roof", w: 5, d: 4, h: 1 });
  objects.push({ x: 9, y: 0, z: 16, color: "", type: "item", itemId: "bush" });
  objects.push({ x: 6, y: 0, z: 16, color: "", type: "item", itemId: "bush" });

  
  // --- BIG CITY EXPANSION 2 --- //

  // Extend Main Road left and right
  for (let x = -30; x <= 30; x++) {
    for (let z = 11; z <= 14; z++) {
      if (x < -15 || x > 15) {
        let c = asphalt;
        if (z === 12 && x % 3 === 0) c = roadLine;
        objects.push({ x, y: 0, z, color: c, type: "block" });
      }
    }
  }

  // Cross Street (x: 18 to 21)
  for (let x = 18; x <= 21; x++) {
    for (let z = -20; z <= 30; z++) {
      if (z < 11 || z > 14) {
        let c = asphalt;
        if (x === 19 && z % 3 === 0) c = roadLine;
        objects.push({ x, y: 0, z, color: c, type: "block" });
      }
    }
  }

  // Cross Street 2 (x: -21 to -18)
  for (let x = -21; x <= -18; x++) {
    for (let z = -20; z <= 30; z++) {
      if (z < 11 || z > 14) {
        let c = asphalt;
        if (x === -20 && z % 3 === 0) c = roadLine;
        objects.push({ x, y: 0, z, color: c, type: "block" });
      }
    }
  }

  // Downtown Skyscrapers (Top Left quadrant, past cross street)
  const downtownZ = 16;
  const colors = ["#10b981", "#8b5cf6", "#f43f5e", "#0ea5e9", "#f59e0b"];
  let bIdx = 0;
  for (let sx = -30; sx <= -24; sx += 6) {
    for (let sz = 16; sz <= 28; sz += 6) {
      const height = Math.floor(Math.random() * 10) + 10;
      const bColor = colors[bIdx % colors.length];
      bIdx++;
      
      // Building footprint
      for (let x = sx; x < sx + 4; x++) {
        for (let z = sz; z < sz + 4; z++) {
          objects.push({ x, y: 0, z, color: plazaStone, type: "block" });
        }
      }

      for (let y = 1; y <= height; y++) {
        for (let x = sx; x < sx + 4; x++) {
          for (let z = sz; z < sz + 4; z++) {
            if (x === sx || x === sx + 3 || z === sz || z === sz + 3) {
              // Windows on every other floor
              const isWindow = (y % 2 !== 0 && (x > sx && x < sx+3 || z > sz && z < sz+3));
              objects.push({ x, y, z, color: isWindow ? skyGlass : bColor, type: "block" });
            }
          }
        }
      }
      // Roof
      objects.push({ x: sx + 1.5, y: height + 1, z: sz + 1.5, color: "#1f2937", type: "large-roof", w: 4, d: 4, h: 1 });
    }
  }

  // Giant Parking Lot (Bottom right quadrant)
  for (let x = 23; x <= 30; x++) {
    for (let z = 16; z <= 28; z++) {
      objects.push({ x, y: 0, z, color: "#374151", type: "block" });
    }
  }
  // Parked vehicles
  const vehicles = ['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'];
  for(let x=24; x<=29; x+=2) {
    for(let z=17; z<=27; z+=3) {
      if (Math.random() > 0.3) {
        const v = vehicles[Math.floor(Math.random() * vehicles.length)];
        objects.push({ x, y: 1, z, color: "", type: "item", itemId: v, rotationY: Math.PI / 2 });
      }
    }
  }

  // Suburban Neighborhood (Top Right quadrant)
  for (let z = -15; z <= 8; z += 6) {
    const sx = 23;
    const sz = z;
    // Lawn
    for(let lx=sx-1; lx<=sx+5; lx++) {
      for(let lz=sz-1; lz<=sz+4; lz++) {
        objects.push({ x: lx, y: 0, z: lz, color: "", type: "item", itemId: "grass_field" });
      }
    }
    // House
    for(let y=1; y<=2; y++) {
      for(let x=sx; x<=sx+3; x++) {
        for(let hz=sz; hz<=sz+3; hz++) {
          if (x===sx || x===sx+3 || hz===sz || hz===sz+3) {
            objects.push({ x, y, z: hz, color: "#d97706", type: "block" });
          }
        }
      }
    }
    objects.push({ x: sx + 1.5, y: 3, z: sz + 1.5, color: "#b91c1c", type: "large-roof", w: 4, d: 4, h: 1 });
    // Car
    objects.push({ x: sx - 2, y: 0, z: sz + 1, color: "", type: "item", itemId: "jeep", rotationY: Math.PI });
    // Tree
    objects.push({ x: sx + 4, y: 0, z: sz + 4, color: "", type: "item", itemId: "tree" });
  }

  // Central City Park (x: -17 to -2, z: -15 to -8)
  for (let x = -17; x <= -2; x++) {
    for (let z = -15; z <= -8; z++) {
      objects.push({ x, y: 0, z, color: "", type: "item", itemId: "grass_field" });
      if (Math.random() > 0.8) objects.push({ x, y: 0, z, color: "", type: "item", itemId: "tree" });
      else if (Math.random() > 0.9) objects.push({ x, y: 0, z, color: "", type: "item", itemId: "bench", rotationY: Math.random() * Math.PI });
      else if (Math.random() > 0.95) objects.push({ x, y: 0, z, color: "", type: "item", itemId: "dog" });
    }
  }


  
  // --- CITY TRAFFIC --- //
  const trafficVehicles = ['lemborgini', 'defender', 'truck', 'bike', 'bus', 'jeep'];
  
  // Main Road Traffic
  for (let tx = -28; tx <= 28; tx += 8) {
    if (Math.random() > 0.4 && (tx < -21 || tx > -18) && (tx < 18 || tx > 21)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Lane 1 (driving left, facing -x)
      objects.push({ x: tx, y: 1, z: 11, color: "", type: "item", itemId: v, rotationY: -Math.PI / 2 });
    }
    if (Math.random() > 0.4 && (tx+4 < -21 || tx+4 > -18) && (tx+4 < 18 || tx+4 > 21)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Lane 2 (driving right, facing +x)
      objects.push({ x: tx+4, y: 1, z: 13.5, color: "", type: "item", itemId: v, rotationY: Math.PI / 2 });
    }
  }

  // Cross Street 1 Traffic (x=18 to 21)
  for (let tz = -15; tz <= 25; tz += 10) {
    if (Math.random() > 0.3 && (tz < 11 || tz > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving down (+z), right side (x=20)
      objects.push({ x: 20, y: 1, z: tz, color: "", type: "item", itemId: v, rotationY: Math.PI });
    }
    if (Math.random() > 0.3 && (tz+5 < 11 || tz+5 > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving up (-z), left side (x=18.5)
      objects.push({ x: 18.5, y: 1, z: tz+5, color: "", type: "item", itemId: v, rotationY: 0 });
    }
  }

  // Cross Street 2 Traffic (x=-21 to -18)
  for (let tz = -15; tz <= 25; tz += 10) {
    if (Math.random() > 0.3 && (tz < 11 || tz > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving down (+z), right side (x=-19)
      objects.push({ x: -19, y: 1, z: tz, color: "", type: "item", itemId: v, rotationY: Math.PI });
    }
    if (Math.random() > 0.3 && (tz+5 < 11 || tz+5 > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving up (-z), left side (x=-20.5)
      objects.push({ x: -20.5, y: 1, z: tz+5, color: "", type: "item", itemId: v, rotationY: 0 });
    }
  }


  // More animals around
  objects.push({ x: -2, y: 1, z: 12, color: "", type: "item", itemId: "dog" }); // Dog crossing road
  objects.push({ x: 14, y: 0, z: 8, color: "", type: "item", itemId: "cat" });
  objects.push({ x: -14, y: 0, z: -2, color: "", type: "item", itemId: "horse" });

  return objects;
}

function generateBungalow(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  const foundationColor = "#475569"; // slate-600
  const wallColor = "#f8fafc"; // slate-50
  const interiorWallColor = "#f1f5f9"; // slate-100
  const roofColor = "#0f172a"; // slate-900
  const woodColor = "#92400e"; // amber-700
  const floorColor = "#d97706"; // amber-500
  const glass = "#ADD8E6"; // glass

  // --- EXTERIOR GROUND ---
  // Foundation
  objects.push({ x: 0, y: 0, z: 0, color: foundationColor, type: "block", width: 28, thickness: 1, depth: 24 });
  // Pool
  objects.push({ x: 0, y: 0, z: 24, color: "#cbd5e1", type: "block", width: 24, thickness: 0.5, depth: 12 });
  objects.push({ x: 0, y: 0.2, z: 24, color: "#3b82f6", type: "block", width: 22, thickness: 0.2, depth: 10 });
  // Cars
  objects.push({ x: -16, y: 0, z: 12, color: "", type: "item", itemId: "defender", rotationY: Math.PI / 6 });
  objects.push({ x: 16, y: 0, z: 14, color: "", type: "item", itemId: "lemborgini", rotationY: -Math.PI / 4 });
  // Trees
  for (let x = -20; x <= 20; x += 10) {
    if (Math.abs(x) < 10) continue;
    objects.push({ x, y: 0, z: 18, color: "", type: "item", itemId: "tree" });
    objects.push({ x, y: 0, z: 30, color: "", type: "item", itemId: "tree" });
  }

  // --- FLOOR 1 ---
  // Outer Walls
  objects.push({ x: -13.5, y: 1, z: 0, color: wallColor, type: "block", width: 1, thickness: 4, depth: 22 }); // Left
  objects.push({ x: 13.5, y: 1, z: 0, color: wallColor, type: "block", width: 1, thickness: 4, depth: 22 }); // Right
  objects.push({ x: 0, y: 1, z: -10.5, color: wallColor, type: "block", width: 28, thickness: 4, depth: 1 }); // Back
  objects.push({ x: -9, y: 1, z: 10.5, color: wallColor, type: "block", width: 10, thickness: 4, depth: 1 }); // Front Left
  objects.push({ x: 9, y: 1, z: 10.5, color: wallColor, type: "block", width: 10, thickness: 4, depth: 1 }); // Front Right
  // Front Center Glass (Split to leave a hole for the door)
  objects.push({ x: -2.5, y: 1, z: 10.5, color: glass, type: "block", width: 3, thickness: 4, depth: 0.2 }); // Left glass
  objects.push({ x: 2.5, y: 1, z: 10.5, color: glass, type: "block", width: 3, thickness: 4, depth: 0.2 }); // Right glass
  objects.push({ x: 0, y: 3, z: 10.5, color: glass, type: "block", width: 2, thickness: 2, depth: 0.2 }); // Top glass above door
  
  // Interior Walls (Dividing into 3 main rooms)
  objects.push({ x: -4.5, y: 1, z: 0, color: interiorWallColor, type: "block", width: 1, thickness: 4, depth: 20 });
  objects.push({ x: 4.5, y: 1, z: 0, color: interiorWallColor, type: "block", width: 1, thickness: 4, depth: 20 });
  
  // Front Door
  objects.push({ x: 0, y: 1, z: 10.6, color: "", type: "item", itemId: "door" });

  // Stairs
  for (let i = 0; i < 9; i++) {
    objects.push({ x: 2.5, y: 1 + i * 0.5, z: 4 - i, color: woodColor, type: "block", width: 3, thickness: 0.5, depth: 1 });
  }

  // Ground Floor Items
  // Left Room (Bedroom)
  objects.push({ x: -10, y: 1, z: 6, color: "", type: "item", itemId: "bed", rotationY: Math.PI / 2 });
  objects.push({ x: -12, y: 1, z: 8, color: "", type: "item", itemId: "chest" });
  objects.push({ x: -7, y: 1, z: -8, color: "", type: "item", itemId: "lamp" });
  // Right Room (Dining)
  objects.push({ x: 9, y: 1, z: 0, color: "", type: "item", itemId: "table" });
  objects.push({ x: 7, y: 1, z: 0, color: "", type: "item", itemId: "stool" });
  objects.push({ x: 11, y: 1, z: 0, color: "", type: "item", itemId: "stool" });
  objects.push({ x: 9, y: 1, z: 2, color: "", type: "item", itemId: "stool" });
  objects.push({ x: 9, y: 1, z: -2, color: "", type: "item", itemId: "stool" });
  // Center Room (Living)
  objects.push({ x: -2, y: 1, z: 0, color: "", type: "item", itemId: "sofa", rotationY: Math.PI / 2 });
  objects.push({ x: 0, y: 1, z: 0, color: "", type: "item", itemId: "table" });

  // --- FLOOR 2 ---
  // Floor Slabs (leaving gap for stairs)
  objects.push({ x: -6.5, y: 5, z: 0, color: floorColor, type: "block", width: 15, thickness: 0.5, depth: 22 }); // Left
  objects.push({ x: 9, y: 5, z: 0, color: floorColor, type: "block", width: 10, thickness: 0.5, depth: 22 }); // Right
  objects.push({ x: 2.5, y: 5, z: -7.5, color: floorColor, type: "block", width: 3, thickness: 0.5, depth: 7 }); // Behind stairs
  objects.push({ x: 2.5, y: 5, z: 7.5, color: floorColor, type: "block", width: 3, thickness: 0.5, depth: 7 }); // In front of stairs

  // Outer Walls (Smaller footprint for front balcony)
  objects.push({ x: 0, y: 5.5, z: -10.5, color: wallColor, type: "block", width: 28, thickness: 4, depth: 1 }); // Back
  objects.push({ x: -13.5, y: 5.5, z: -2.5, color: wallColor, type: "block", width: 1, thickness: 4, depth: 15 }); // Left
  objects.push({ x: 13.5, y: 5.5, z: -2.5, color: wallColor, type: "block", width: 1, thickness: 4, depth: 15 }); // Right
  objects.push({ x: 0, y: 5.5, z: 4.5, color: glass, type: "block", width: 26, thickness: 4, depth: 1 }); // Front Glass Wall

  // Balcony Glass Railing
  objects.push({ x: 0, y: 5.5, z: 10.8, color: glass, type: "block", width: 28, thickness: 1.5, depth: 0.2 }); // Front rail
  objects.push({ x: -13.8, y: 5.5, z: 7.5, color: glass, type: "block", width: 0.2, thickness: 1.5, depth: 6 }); // Left rail
  objects.push({ x: 13.8, y: 5.5, z: 7.5, color: glass, type: "block", width: 0.2, thickness: 1.5, depth: 6 }); // Right rail

  // Balcony Items
  objects.push({ x: -8, y: 5.5, z: 8, color: "", type: "item", itemId: "bench" });
  objects.push({ x: 8, y: 5.5, z: 8, color: "", type: "item", itemId: "bench" });
  objects.push({ x: -12, y: 5.5, z: 9, color: "", type: "item", itemId: "bush" });
  objects.push({ x: 12, y: 5.5, z: 9, color: "", type: "item", itemId: "bush" });
  objects.push({ x: 0, y: 5.5, z: 8, color: "", type: "item", itemId: "dog" });

  // Floor 2 Interior Items
  objects.push({ x: -8, y: 5.5, z: -6, color: "", type: "item", itemId: "bed", rotationY: Math.PI / 2 });
  objects.push({ x: 8, y: 5.5, z: -6, color: "", type: "item", itemId: "bed", rotationY: Math.PI / 2 });

  // --- ROOF ---
  // Pitched Roofs using Wedges
  objects.push({ x: -7, y: 9.5, z: -3, color: roofColor, type: "block", blockShape: "wedge", width: 14, thickness: 4, depth: 16, rotationY: Math.PI });
  objects.push({ x: 7, y: 9.5, z: -3, color: roofColor, type: "block", blockShape: "wedge", width: 14, thickness: 4, depth: 16, rotationY: 0 });

  // Small Front Overhang/Awning
  objects.push({ x: 0, y: 9.5, z: 8, color: woodColor, type: "block", blockShape: "wedge", width: 6, thickness: 2, depth: 28, rotationY: -Math.PI / 2 });

  return objects;
}

function generateModernFarmhouse(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  
  const whiteSiding = "#f8fafc";
  const stoneColor = "#d6d3d1";
  const trimColor = "#0f172a"; 
  const woodAccent = "#3f3f46";
  const glassColor = "#ADD8E6";
  const grassColor = "#4ade80";
  const concreteColor = "#e2e8f0";
  const interiorFloor = "#d97706";

  // --- LANDSCAPING ---
  // Base Grass
  objects.push({ x: 0, y: 0, z: 0, color: grassColor, type: "block", width: 40, thickness: 0.5, depth: 40 });
  
  // Concrete Driveway Grid
  for (let cx = 2; cx <= 14; cx += 4) {
    for (let cz = 10; cz <= 18; cz += 4) {
      objects.push({ x: cx, y: 0, z: cz, color: concreteColor, type: "block", width: 3.5, thickness: 0.55, depth: 3.5 });
    }
  }
  // Walkway to door
  objects.push({ x: 0, y: 0, z: 8, color: concreteColor, type: "block", width: 3.5, thickness: 0.55, depth: 3.5 });
  objects.push({ x: 0, y: 0, z: 12, color: concreteColor, type: "block", width: 3.5, thickness: 0.55, depth: 3.5 });

  // Trees and Bushes
  for (let x of [-16, -12, 16, 18]) {
    objects.push({ x, y: 0.5, z: 16, color: "", type: "item", itemId: "tree" });
  }
  for (let x = -16; x <= -4; x += 3) {
    objects.push({ x, y: 0.5, z: 12, color: "", type: "item", itemId: "bush" });
    objects.push({ x, y: 0.5, z: 8, color: "", type: "item", itemId: "bush" });
  }
  
  // --- FLOOR 1 ---
  // Floors
  objects.push({ x: 0, y: 0.5, z: -4, color: interiorFloor, type: "block", width: 12, thickness: 0.2, depth: 16 });
  objects.push({ x: 10, y: 0.5, z: 0, color: concreteColor, type: "block", width: 8, thickness: 0.2, depth: 12 });
  objects.push({ x: -9, y: 0.5, z: -2, color: interiorFloor, type: "block", width: 6, thickness: 0.2, depth: 12 });

  // Main Body Outer Walls
  objects.push({ x: 0, y: 0.5, z: -11.5, color: whiteSiding, type: "block", width: 12, thickness: 4, depth: 1 }); // Back
  objects.push({ x: -5.5, y: 0.5, z: -4, color: whiteSiding, type: "block", width: 1, thickness: 4, depth: 14 }); // Left
  objects.push({ x: 5.5, y: 0.5, z: -4, color: whiteSiding, type: "block", width: 1, thickness: 4, depth: 14 }); // Right
  
  // Main Body Front Wall (with door gap)
  objects.push({ x: -3.5, y: 0.5, z: 2.5, color: whiteSiding, type: "block", width: 3, thickness: 4, depth: 1 });
  objects.push({ x: 3.5, y: 0.5, z: 2.5, color: whiteSiding, type: "block", width: 3, thickness: 4, depth: 1 });
  objects.push({ x: 0, y: 3.5, z: 2.5, color: whiteSiding, type: "block", width: 4, thickness: 1, depth: 1 }); // above door
  objects.push({ x: 0, y: 0.5, z: 2.6, color: "", type: "item", itemId: "door" });

  // Right Wing (Garage) Walls - Stone
  objects.push({ x: 10, y: 0.5, z: -5.5, color: stoneColor, type: "block", width: 8, thickness: 4, depth: 1 }); // Back
  objects.push({ x: 13.5, y: 0.5, z: 0, color: stoneColor, type: "block", width: 1, thickness: 4, depth: 10 }); // Right
  objects.push({ x: 10, y: 0.5, z: 5.5, color: stoneColor, type: "block", width: 8, thickness: 4, depth: 1 }); // Front

  // Garage Door
  objects.push({ x: 10, y: 0.5, z: 5.6, color: trimColor, type: "block", width: 6, thickness: 3.2, depth: 0.2 });
  for(let y = 1; y < 3.5; y += 0.5) {
     objects.push({ x: 10, y: y, z: 5.65, color: whiteSiding, type: "block", width: 5.8, thickness: 0.05, depth: 0.2 });
  }

  // Left Wing Walls - Stone
  objects.push({ x: -9, y: 0.5, z: -7.5, color: stoneColor, type: "block", width: 6, thickness: 4, depth: 1 }); // Back
  objects.push({ x: -11.5, y: 0.5, z: -2, color: stoneColor, type: "block", width: 1, thickness: 4, depth: 10 }); // Left
  objects.push({ x: -9, y: 0.5, z: 3.5, color: stoneColor, type: "block", width: 6, thickness: 4, depth: 1 }); // Front

  // --- FLOOR 2 ---
  objects.push({ x: 0, y: 4.5, z: -4, color: interiorFloor, type: "block", width: 12, thickness: 0.5, depth: 16 });
  
  // Floor 2 Walls (White)
  objects.push({ x: 0, y: 5, z: -11.5, color: whiteSiding, type: "block", width: 12, thickness: 4, depth: 1 });
  objects.push({ x: -5.5, y: 5, z: -4, color: whiteSiding, type: "block", width: 1, thickness: 4, depth: 14 });
  objects.push({ x: 5.5, y: 5, z: -4, color: whiteSiding, type: "block", width: 1, thickness: 4, depth: 14 });
  objects.push({ x: 0, y: 5, z: 2.5, color: whiteSiding, type: "block", width: 12, thickness: 4, depth: 1 });

  // --- ROOFS (Black) ---
  // Main Body Pitched Roof (Slopes left/right)
  objects.push({ x: -3, y: 9, z: -4, color: trimColor, type: "block", blockShape: "wedge", width: 6, thickness: 3, depth: 16, rotationY: Math.PI });
  objects.push({ x: 3, y: 9, z: -4, color: trimColor, type: "block", blockShape: "wedge", width: 6, thickness: 3, depth: 16, rotationY: 0 });

  // Right Wing Gable
  objects.push({ x: 8, y: 4.5, z: 0, color: trimColor, type: "block", blockShape: "wedge", width: 4, thickness: 3, depth: 12, rotationY: Math.PI });
  objects.push({ x: 12, y: 4.5, z: 0, color: trimColor, type: "block", blockShape: "wedge", width: 4, thickness: 3, depth: 12, rotationY: 0 });
  
  // Left Wing Gable
  objects.push({ x: -10.5, y: 4.5, z: -2, color: trimColor, type: "block", blockShape: "wedge", width: 3, thickness: 2.5, depth: 12, rotationY: Math.PI });
  objects.push({ x: -7.5, y: 4.5, z: -2, color: trimColor, type: "block", blockShape: "wedge", width: 3, thickness: 2.5, depth: 12, rotationY: 0 });

  // Entrance Porch Overhang
  objects.push({ x: -2, y: 4, z: 5.5, color: woodAccent, type: "block", blockShape: "wedge", width: 4, thickness: 1.5, depth: 5, rotationY: Math.PI });
  objects.push({ x: 2, y: 4, z: 5.5, color: woodAccent, type: "block", blockShape: "wedge", width: 4, thickness: 1.5, depth: 5, rotationY: 0 });
  // Porch Pillars (Stone)
  objects.push({ x: -3.5, y: 0.5, z: 7, color: stoneColor, type: "block", width: 1, thickness: 3.5, depth: 1 });
  objects.push({ x: 3.5, y: 0.5, z: 7, color: stoneColor, type: "block", width: 1, thickness: 3.5, depth: 1 });

  // --- WINDOWS (Black frames, glass inner) ---
  const addWindow = (wx: number, wy: number, wz: number, w: number, h: number) => {
    objects.push({ x: wx, y: wy, z: wz, color: trimColor, type: "block", width: w+0.2, thickness: h+0.2, depth: 1.2 });
    objects.push({ x: wx, y: wy+0.1, z: wz, color: glassColor, type: "block", width: w, thickness: h, depth: 1.3 });
  };
  
  // Floor 2 Main Front Windows
  addWindow(-2.5, 5.5, 2.5, 2, 2.5);
  addWindow(2.5, 5.5, 2.5, 2, 2.5);
  // Floor 2 Side Windows
  objects.push({ x: -5.5, y: 5.5, z: -4, color: trimColor, type: "block", width: 1.2, thickness: 2.7, depth: 2.2 });
  objects.push({ x: -5.5, y: 5.6, z: -4, color: glassColor, type: "block", width: 1.3, thickness: 2.5, depth: 2 });
  
  // Left Wing Front Window
  addWindow(-9, 1.5, 3.5, 2.5, 2);
  
  // Garage Side Window
  objects.push({ x: 13.5, y: 1.5, z: 0, color: trimColor, type: "block", width: 1.2, thickness: 2.2, depth: 3.2 });
  objects.push({ x: 13.5, y: 1.6, z: 0, color: glassColor, type: "block", width: 1.3, thickness: 2.0, depth: 3.0 });

  // --- INTERIOR FURNITURE ---
  objects.push({ x: 0, y: 0.5, z: -4, color: "", type: "item", itemId: "sofa", rotationY: Math.PI });
  objects.push({ x: 0, y: 0.5, z: -2, color: "", type: "item", itemId: "table" });
  objects.push({ x: -8, y: 0.5, z: 0, color: "", type: "item", itemId: "bed" });
  objects.push({ x: 0, y: 5.0, z: -4, color: "", type: "item", itemId: "bed", rotationY: Math.PI / 2 });
  objects.push({ x: -3, y: 5.0, z: -8, color: "", type: "item", itemId: "chest" });
  objects.push({ x: 3, y: 5.0, z: -8, color: "", type: "item", itemId: "lamp" });

  return objects;
}

function generateModernVilla(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  
  // Colors and Textures
  const white = "#f8fafc";
  const darkGrey = "#334155";
  const lightGrey = "#e2e8f0";
  const warmLight = "#fef08a";
  const grassColor = "#4ade80";

  // Helper to add walls
  const addWall = (x: number, y: number, z: number, w: number, h: number, d: number, color: string = white, mat: string = "color", tex?: string) => {
    objects.push({ x, y, z, color, type: "block", width: w, thickness: h, depth: d, materialType: mat as any, textureId: tex });
  };

  // --- BASE TERRAIN (y: -0.4, sits on grid at -0.5) ---
  for (let x = -25; x <= 0; x++) {
    for (let z = -15; z <= 15; z++) {
      if (Math.random() > 0.6) {
        objects.push({ x, y: -0.5, z, color: "", type: "item", itemId: "grass_field" });
      } else {
        objects.push({ x, y: -0.4, z, color: grassColor, type: "block", thickness: 0.2 });
      }
    }
  }
  
  // Driveway (stone)
  objects.push({ x: 5, y: -0.4, z: 2, color: lightGrey, type: "block", width: 24, thickness: 0.2, depth: 28, materialType: "texture", textureId: "stone" });
  
  // Foundation (y: -0.1, sits on driveway) -> Top is at y=0.1
  objects.push({ x: 0, y: -0.1, z: -3, color: lightGrey, type: "block", width: 30, thickness: 0.4, depth: 16 });

  // ================= GROUND FLOOR =================
  
  // --- GARAGE (Right Wing) ---
  // Back Wall
  addWall(9, 1.6, -9.75, 10, 3, 0.5);
  // Right Wall
  addWall(13.75, 1.6, -3, 0.5, 3, 13);
  // Front Wall (Garage Doors)
  addWall(4.5, 1.6, 3.75, 1, 3, 0.5);
  addWall(9, 1.6, 3.75, 1, 3, 0.5);
  addWall(13.5, 1.6, 3.75, 1, 3, 0.5);
  addWall(6.75, 1.6, 3.85, 3.5, 2.8, 0.2, "#8B5A2B", "texture", "wood");
  addWall(11.25, 1.6, 3.85, 3.5, 2.8, 0.2, "#8B5A2B", "texture", "wood");
  
  // Left Wall Part 1 (Back to Door) Z: -9.5 to -1
  addWall(4.25, 1.6, -5.25, 0.5, 3, 8.5);
  // Doorway header (above door, y: 2.6 to 3.1)
  addWall(4.25, 2.85, 0, 0.5, 0.5, 2);
  // Left Wall Part 2 (Door to Front) Z: 1 to 3.5
  addWall(4.25, 1.6, 2.25, 0.5, 3, 2.5);

  // Garage Ceiling
  addWall(9, 3.2, -3, 10, 0.2, 14);

  // --- LEFT WING ---
  // Back Wall
  addWall(-8, 1.6, -8.75, 10, 3, 0.5);
  // Left Wall
  addWall(-12.75, 1.6, -3, 0.5, 3, 11);
  // Front Wall (Wood slat feature)
  addWall(-5.5, 1.6, 2.75, 5, 3, 0.5);
  addWall(-10.5, 1.6, 2.85, 5, 3, 0.3, "#8B5A2B", "texture", "wood");
  
  // Right Wall Part 1
  addWall(-3.25, 1.6, -4.75, 0.5, 3, 7.5);
  // Doorway header
  addWall(-3.25, 2.85, 0, 0.5, 0.5, 2);
  // Right Wall Part 2
  addWall(-3.25, 1.6, 1.75, 0.5, 3, 1.5);

  // Left Wing Ceiling (Dark trim)
  addWall(-8, 3.2, -3, 11, 0.4, 13, darkGrey);

  // --- ATRIUM ---
  // Floor (White)
  addWall(0.5, 0.15, -3, 7, 0.1, 14);
  
  // Front Glass Wall (Double height)
  addWall(-1.75, 3.2, 2.5, 2.5, 6.2, 0.2, "#ADD8E6", "glass");
  addWall(2.75, 3.2, 2.5, 2.5, 6.2, 0.2, "#ADD8E6", "glass");
  addWall(0.5, 4.2, 2.5, 2, 4.2, 0.2, "#ADD8E6", "glass");
  
  // Stone Pillar at X=3.5 (in front of glass)
  addWall(3.5, 3.2, 2.5, 1.5, 6.2, 2, "#808080", "texture", "stone");

  // Atrium Back Wall (Glass)
  addWall(0.5, 3.2, -9.9, 7, 6.2, 0.2, "#ADD8E6", "glass");

  // Atrium Ceiling
  addWall(0.5, 6.6, -3.5, 9, 0.4, 15, darkGrey);


  // ================= STAIRCASE =================
  // Stairs in Atrium, ascending along the back wall
  for (let i = 0; i < 12; i++) {
    const stepX = -2 + (i * 0.4); 
    const stepY = 0.2 + (i * 0.25) + 0.125; 
    addWall(stepX, stepY, -9, 0.4, 0.25, 1.5, darkGrey);
  }
  // Landing at X=3, Z=-9 to Z=-3 (Catwalk)
  addWall(3, 3.2, -6, 2, 0.2, 6, lightGrey);
  // Catwalk stretching across Atrium 
  addWall(0.5, 3.2, -2, 7, 0.2, 2, lightGrey);
  // Glass railing for catwalk
  addWall(0.5, 3.7, -0.9, 7, 1.0, 0.1, "#ADD8E6", "glass");
  addWall(1.9, 3.7, -3.1, 4.2, 1.0, 0.1, "#ADD8E6", "glass");


  // ================= UPPER FLOOR =================

  // --- RIGHT WING UPPER (Bedroom) ---
  // Back Wall
  addWall(9, 4.8, -9.75, 10, 3, 0.5);
  // Right Wall
  addWall(13.75, 4.8, -5.5, 0.5, 3, 8);
  // Left Wall (shared with atrium)
  addWall(4.25, 4.8, -6.25, 0.5, 3, 6.5);
  addWall(4.25, 6.0, -2, 0.5, 0.5, 2); // Header
  addWall(4.25, 4.8, -1.25, 0.5, 3, 0.5);
  // Front Wall (Glass wall to balcony)
  addWall(9, 4.8, -1.5, 10, 3, 0.2, "#ADD8E6", "glass");
  
  // Right Wing Balcony
  addWall(9, 3.25, 1.25, 10, 0.3, 5.5, lightGrey); // Floor
  addWall(9, 3.9, 3.9, 10, 1, 0.1, "#ADD8E6", "glass"); // Glass Railing
  addWall(13.9, 3.9, 1.25, 0.1, 1, 5.5, "#ADD8E6", "glass");
  // Privacy wood slats
  addWall(13.5, 4.8, 2.5, 0.5, 3, 3, "#8B5A2B", "texture", "wood");
  addWall(12, 4.8, 3.8, 2, 3, 0.2, "#8B5A2B", "texture", "wood");

  // Right Wing Ceiling & Roof
  addWall(9, 6.4, -5.5, 10, 0.2, 9); // Ceiling
  addWall(9, 6.75, -2.5, 11, 0.5, 15, lightGrey); // White border
  addWall(9, 7.1, -2.5, 10.5, 0.2, 14.5, darkGrey); // Dark top

  // --- LEFT WING UPPER (Bedroom / Office) ---
  // Back Wall
  addWall(-8, 4.8, -8.75, 10, 3, 0.5);
  // Left Wall
  addWall(-12.75, 4.8, -4, 0.5, 3, 9);
  // Front Wall (White with Windows)
  addWall(-11.5, 4.8, 0.75, 3, 3, 0.5); // Left solid
  addWall(-9, 4.8, 0.75, 2, 3, 0.2, "#ADD8E6", "glass"); // Window 1
  addWall(-6.5, 4.8, 0.75, 3, 3, 0.5); // Middle solid
  addWall(-4.25, 4.8, 0.75, 1.5, 3, 0.2, "#ADD8E6", "glass"); // Window 2
  addWall(-3.25, 4.8, 0.75, 0.5, 3, 0.5); // Right solid
  // Window headers/sills
  addWall(-9, 3.6, 0.75, 2, 0.6, 0.5);
  addWall(-9, 6.0, 0.75, 2, 0.6, 0.5);
  addWall(-4.25, 3.6, 0.75, 1.5, 0.6, 0.5);
  addWall(-4.25, 6.0, 0.75, 1.5, 0.6, 0.5);

  // Right Wall (Shared with Atrium)
  addWall(-3.25, 4.8, -6.25, 0.5, 3, 6.5);
  addWall(-3.25, 6.0, -2, 0.5, 0.5, 2); // Header
  addWall(-3.25, 4.8, -0.25, 0.5, 3, 1.5);

  // Left Wing Ceiling & Roof
  addWall(-8, 6.4, -4, 10, 0.2, 10); // Ceiling
  addWall(-8, 6.7, -4, 10.5, 0.4, 11, lightGrey); // White border
  addWall(-8, 7.0, -4, 10, 0.2, 10.5, darkGrey); // Dark top

  // ================= LIGHTING =================
  const addLight = (lx: number, ly: number, lz: number) => {
    objects.push({ x: lx, y: ly, z: lz, color: warmLight, type: "block", width: 0.4, thickness: 0.1, depth: 0.4 });
    objects.push({ x: lx, y: ly-0.5, z: lz, color: warmLight, type: "block", width: 0.8, thickness: 0.8, depth: 0.1, materialType: "glass" });
  };
  addLight(-9, 3.1, 3.1);
  addLight(-4.25, 3.1, 1.1);

  // ================= EXTERIOR ITEMS =================
  objects.push({ x: -14, y: -0.4, z: 6, color: "", type: "item", itemId: "tree" });
  objects.push({ x: -12, y: -0.4, z: 9, color: "", type: "item", itemId: "bush" });
  objects.push({ x: -15, y: -0.4, z: 3, color: "", type: "item", itemId: "pine_tree_big" });
  
  // ================= INTERIOR ITEMS =================
  // Garage
  objects.push({ x: 9, y: 0.1, z: 0, color: "", type: "item", itemId: "car", rotationY: Math.PI });
  
  // Ground Floor Living Room (Left Wing)
  objects.push({ x: -8, y: 0.1, z: -2, color: "", type: "item", itemId: "sofa", rotationY: Math.PI/2 });
  objects.push({ x: -11, y: 0.1, z: -2, color: "", type: "item", itemId: "table" });
  objects.push({ x: -11, y: 0.1, z: -4, color: "", type: "item", itemId: "chair", rotationY: -Math.PI/2 });
  objects.push({ x: -5, y: 0.1, z: -7, color: "", type: "item", itemId: "lamp" });

  // Upper Floor Bedrooms
  // Right Wing Upper
  objects.push({ x: 9, y: 3.3, z: -8, color: "", type: "item", itemId: "bed" });
  objects.push({ x: 12, y: 3.3, z: -8, color: "", type: "item", itemId: "chest" });
  
  // Left Wing Upper
  objects.push({ x: -8, y: 3.3, z: -6, color: "", type: "item", itemId: "bed", rotationY: -Math.PI/2 });
  objects.push({ x: -12, y: 3.3, z: -4, color: "", type: "item", itemId: "wardrobe", rotationY: Math.PI/2 });

  return objects;
}

export const EXAMPLE_WORLDS = [
  { id: 'house', name: 'Cozy House', emoji: '🏠', objects: generateHouse() },
  { id: 'farm', name: 'Farm & Zoo', emoji: '🐄', objects: generateFarm() },
  { id: 'park', name: 'City Park', emoji: '🌳', objects: generatePark() },
  { id: 'mansion', name: 'Modern Metropolis', emoji: '🏰', objects: generateMansion() },
  { id: 'bungalow', name: 'Tremendous Bungalow', emoji: '🏡', objects: generateBungalow() },
  { id: 'farmhouse', name: 'Modern Farmhouse', emoji: '🌾', objects: generateModernFarmhouse() },
  { id: 'modern-villa', name: 'Modern Villa', emoji: '🏡', objects: generateModernVilla() },
];
