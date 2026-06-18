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
        objects.push({ x, y: 0, z, color: "", type: "item", itemId: v, rotationY: Math.PI / 2 });
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
      objects.push({ x: tx, y: 0, z: 11, color: "", type: "item", itemId: v, rotationY: -Math.PI / 2 });
    }
    if (Math.random() > 0.4 && (tx+4 < -21 || tx+4 > -18) && (tx+4 < 18 || tx+4 > 21)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Lane 2 (driving right, facing +x)
      objects.push({ x: tx+4, y: 0, z: 13.5, color: "", type: "item", itemId: v, rotationY: Math.PI / 2 });
    }
  }

  // Cross Street 1 Traffic (x=18 to 21)
  for (let tz = -15; tz <= 25; tz += 10) {
    if (Math.random() > 0.3 && (tz < 11 || tz > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving down (+z), right side (x=20)
      objects.push({ x: 20, y: 0, z: tz, color: "", type: "item", itemId: v, rotationY: Math.PI });
    }
    if (Math.random() > 0.3 && (tz+5 < 11 || tz+5 > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving up (-z), left side (x=18.5)
      objects.push({ x: 18.5, y: 0, z: tz+5, color: "", type: "item", itemId: v, rotationY: 0 });
    }
  }

  // Cross Street 2 Traffic (x=-21 to -18)
  for (let tz = -15; tz <= 25; tz += 10) {
    if (Math.random() > 0.3 && (tz < 11 || tz > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving down (+z), right side (x=-19)
      objects.push({ x: -19, y: 0, z: tz, color: "", type: "item", itemId: v, rotationY: Math.PI });
    }
    if (Math.random() > 0.3 && (tz+5 < 11 || tz+5 > 14)) {
      const v = trafficVehicles[Math.floor(Math.random() * trafficVehicles.length)];
      // Driving up (-z), left side (x=-20.5)
      objects.push({ x: -20.5, y: 0, z: tz+5, color: "", type: "item", itemId: v, rotationY: 0 });
    }
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
  { id: 'mansion', name: 'Modern Metropolis', emoji: '🏰', objects: generateMansion() },
];
