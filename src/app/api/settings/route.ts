import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Settings } from "@/models/Settings";
import { getTeacherId } from "@/lib/auth-helpers";

const DEFAULT_SETTINGS = {
  "prefabs": [
    {
      "id": "prefab_1783425411699",
      "name": "Prefab 1",
      "emoji": "📦",
      "objects": [
        {
          "x": 0,
          "y": 0,
          "z": 0,
          "color": "#B22222",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a30f7edb6e6ffcc352cbf6c"
        },
        {
          "x": 0,
          "y": 1,
          "z": 0,
          "color": "#B22222",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a30f7edb6e6ffcc352cbf6d"
        }
      ]
    },
    {
      "id": "prefab_1783445439309",
      "name": "Prefab 2",
      "emoji": "📦",
      "objects": [
        {
          "x": 1,
          "y": 0,
          "z": -1,
          "color": "#8B5A2B",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "width": 1,
          "curveness": 4,
          "_id": "6a3b4ca153ffbbc109170f84"
        },
        {
          "x": -1,
          "y": 0,
          "z": -1,
          "color": "#8B5A2B",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "width": 1,
          "curveness": 4,
          "_id": "6a3b4ca653ffbbc109171c0d"
        },
        {
          "x": -2,
          "y": 0,
          "z": -1,
          "color": "#8B5A2B",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "width": 1,
          "curveness": 4,
          "_id": "6a3b4cb653ffbbc109172ca6"
        },
        {
          "x": 0,
          "y": 0,
          "z": -1,
          "color": "#8B5A2B",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "width": 1,
          "curveness": 4,
          "_id": "6a3b4cb653ffbbc109172ca7"
        },
        {
          "x": -2,
          "y": 0,
          "z": 0,
          "color": "#8B5A2B",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "width": 1,
          "curveness": 4,
          "_id": "6a3b4ce553ffbbc1091748b6"
        },
        {
          "x": -1,
          "y": 0,
          "z": 0,
          "color": "#8B5A2B",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "width": 1,
          "curveness": 4,
          "_id": "6a3b4ce553ffbbc1091748b7"
        }
      ]
    },
    {
      "id": "prefab_1783488028522",
      "name": "Prefab 3",
      "emoji": "📦",
      "objects": [
        {
          "x": -1,
          "y": 0,
          "z": -1,
          "color": "#808080",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a2fee78e3854ecfc54fea58"
        },
        {
          "x": -3,
          "y": 0,
          "z": -1,
          "color": "#808080",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a2fee7ee3854ecfc54fea82"
        },
        {
          "x": 1,
          "y": 0,
          "z": -1,
          "color": "#B22222",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a2ff44a84298442a4ae0746"
        },
        {
          "x": 2,
          "y": 2,
          "z": 0,
          "color": "#B22222",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a2ff44e84298442a4ae0984"
        },
        {
          "x": 2,
          "y": 0,
          "z": -1,
          "color": "#B22222",
          "type": "block",
          "rotationY": 0,
          "thickness": 1,
          "depth": 1,
          "_id": "6a3029555e479e8049cfb370"
        }
      ]
    }
  ],
  "allowStudentToStopTimer": true,
  "bundleLimit": 1000,
  "bundleItemName": "🍫 Chocolate",
  "weeklyTargetPoints": 5000,
  "tieredRewards": [
    {
      "name": "Excellent!",
      "points": 5000
    },
    {
      "name": "Going Fast!",
      "points": 4750
    },
    {
      "name": "Good!",
      "points": 4500
    }
  ],
  "builderBlockCost": 10,
  "builderRoofCost": 100,
  "customColorCost": 100,
  "builderBlockRefund": 0,
  "landUpgradeCost": 1000,
  "landUpgradeAmount": 50,
  "builderQuote": "For my beloved Parents ❤️👨‍👩‍👧‍👦✨",
  "builderItems": [
    {
      "id": "tree",
      "name": "Tree",
      "emoji": "🌲",
      "cost": 20,
      "refundOnErase": 20,
      "width": 1,
      "height": 2.5,
      "depth": 1
    },
    {
      "id": "pine_tree_big",
      "name": "Big Pine Tree",
      "emoji": "🌲",
      "cost": 30,
      "refundOnErase": 30,
      "width": 1.5,
      "height": 4,
      "depth": 1.5
    },
    {
      "id": "pine_tree_small",
      "name": "Small Pine Tree",
      "emoji": "🌲",
      "cost": 10,
      "refundOnErase": 10,
      "width": 0.8,
      "height": 1.8,
      "depth": 0.8
    },
    {
      "id": "oak_tree_big",
      "name": "Big Oak Tree",
      "emoji": "🌳",
      "cost": 50,
      "refundOnErase": 50,
      "width": 2,
      "height": 3.5,
      "depth": 2
    },
    {
      "id": "oak_tree_small",
      "name": "Small Oak Tree",
      "emoji": "🌳",
      "cost": 40,
      "refundOnErase": 40,
      "width": 1.2,
      "height": 2,
      "depth": 1.2
    },
    {
      "id": "palm_tree",
      "name": "Palm Tree",
      "emoji": "🌴",
      "cost": 40,
      "refundOnErase": 40,
      "width": 1,
      "height": 4,
      "depth": 1
    },
    {
      "id": "flower",
      "name": "Flower",
      "emoji": "🌸",
      "cost": 5,
      "refundOnErase": 5,
      "width": 0.5,
      "height": 0.6,
      "depth": 0.5
    },
    {
      "id": "lamp",
      "name": "Lamp Post",
      "emoji": "🏮",
      "cost": 75,
      "refundOnErase": 35,
      "width": 0.4,
      "height": 2.5,
      "depth": 0.4
    },
    {
      "id": "fence",
      "name": "Fence",
      "emoji": "🏗️",
      "cost": 20,
      "refundOnErase": 15,
      "width": 1.5,
      "height": 0.8,
      "depth": 0.15
    },
    {
      "id": "cat",
      "name": "Cat",
      "emoji": "🐈",
      "cost": 100,
      "refundOnErase": 50,
      "width": 0.5,
      "height": 0.6,
      "depth": 0.8
    },
    {
      "id": "horse",
      "name": "Horse",
      "emoji": "🐎",
      "cost": 300,
      "refundOnErase": 150,
      "width": 1,
      "height": 2,
      "depth": 2.2
    },
    {
      "id": "cow",
      "name": "Cow",
      "emoji": "🐄",
      "cost": 250,
      "refundOnErase": 125,
      "width": 1.2,
      "height": 1.8,
      "depth": 2
    },
    {
      "id": "goat",
      "name": "Goat",
      "emoji": "🐐",
      "cost": 150,
      "refundOnErase": 75,
      "width": 0.8,
      "height": 1.2,
      "depth": 1.4
    },
    {
      "id": "dog",
      "name": "Dog",
      "emoji": "🐕",
      "cost": 120,
      "refundOnErase": 60,
      "width": 0.6,
      "height": 0.8,
      "depth": 1
    },
    {
      "id": "pig",
      "name": "Pig",
      "emoji": "🐖",
      "cost": 150,
      "refundOnErase": 75,
      "width": 0.8,
      "height": 1,
      "depth": 1.5
    },
    {
      "id": "chicken",
      "name": "Chicken",
      "emoji": "🐓",
      "cost": 80,
      "refundOnErase": 40,
      "width": 0.4,
      "height": 0.5,
      "depth": 0.5
    },
    {
      "id": "bench",
      "name": "Bench",
      "emoji": "🪑",
      "cost": 80,
      "refundOnErase": 40,
      "width": 2,
      "height": 0.8,
      "depth": 0.8
    },
    {
      "id": "grass_field",
      "name": "Grass Field",
      "emoji": "🌿",
      "cost": 2,
      "refundOnErase": 1,
      "width": 1,
      "height": 0.1,
      "depth": 1
    },
    {
      "id": "bush",
      "name": "Bush",
      "emoji": "🌿",
      "cost": 60,
      "refundOnErase": 30,
      "width": 1,
      "height": 1,
      "depth": 1
    },
    {
      "id": "rock",
      "name": "Rock",
      "emoji": "🪨",
      "cost": 50,
      "refundOnErase": 25,
      "width": 1,
      "height": 0.8,
      "depth": 1
    },
    {
      "id": "bed",
      "name": "Bed",
      "emoji": "🛏️",
      "cost": 150,
      "refundOnErase": 75,
      "width": 1.5,
      "height": 0.5,
      "depth": 2
    },
    {
      "id": "table",
      "name": "Table",
      "emoji": "🪑",
      "cost": 120,
      "refundOnErase": 60,
      "width": 2,
      "height": 1,
      "depth": 2
    },
    {
      "id": "stool",
      "name": "Stool",
      "emoji": "🪑",
      "cost": 40,
      "refundOnErase": 20,
      "width": 0.8,
      "height": 0.6,
      "depth": 0.8
    },
    {
      "id": "sofa",
      "name": "Sofa",
      "emoji": "🛋️",
      "cost": 200,
      "refundOnErase": 100,
      "width": 2,
      "height": 1.2,
      "depth": 1
    },
    {
      "id": "chair",
      "name": "Chair",
      "emoji": "🪑",
      "cost": 60,
      "refundOnErase": 30,
      "width": 0.8,
      "height": 1.2,
      "depth": 0.8
    },
    {
      "id": "bookshelf",
      "name": "Bookshelf",
      "emoji": "📚",
      "cost": 180,
      "refundOnErase": 90,
      "width": 2,
      "height": 2.5,
      "depth": 0.6
    },
    {
      "id": "wardrobe",
      "name": "Wardrobe",
      "emoji": "🚪",
      "cost": 200,
      "refundOnErase": 100,
      "width": 2,
      "height": 2.8,
      "depth": 1
    },
    {
      "id": "door",
      "name": "Door",
      "emoji": "🚪",
      "cost": 50,
      "refundOnErase": 25,
      "width": 0.8,
      "height": 1.8,
      "depth": 0.2
    },
    {
      "id": "window",
      "name": "Window",
      "emoji": "🪟",
      "cost": 40,
      "refundOnErase": 20,
      "width": 0.8,
      "height": 0.8,
      "depth": 0.1
    },
    {
      "id": "lemborgini",
      "name": "Lemborgini",
      "emoji": "🏎️",
      "cost": 500,
      "refundOnErase": 250,
      "width": 3,
      "height": 1,
      "depth": 1.5
    },
    {
      "id": "defender",
      "name": "Defender",
      "emoji": "🚙",
      "cost": 450,
      "refundOnErase": 225,
      "width": 2.8,
      "height": 1.8,
      "depth": 1.4
    },
    {
      "id": "truck",
      "name": "Truck",
      "emoji": "🛻",
      "cost": 600,
      "refundOnErase": 300,
      "width": 3.5,
      "height": 2.2,
      "depth": 1.5
    },
    {
      "id": "bike",
      "name": "Bike",
      "emoji": "🏍️",
      "cost": 350,
      "refundOnErase": 175,
      "width": 2.2,
      "height": 1.2,
      "depth": 0.6
    },
    {
      "id": "bus",
      "name": "Bus",
      "emoji": "🚌",
      "cost": 700,
      "refundOnErase": 350,
      "width": 5,
      "height": 2,
      "depth": 1.5
    },
    {
      "id": "street_light",
      "name": "Street Light",
      "emoji": "💡",
      "cost": 80,
      "refundOnErase": 40,
      "width": 0.5,
      "height": 3.5,
      "depth": 0.5
    },
    {
      "id": "fountain",
      "name": "Fountain",
      "emoji": "⛲",
      "cost": 300,
      "refundOnErase": 150,
      "width": 2.5,
      "height": 1.5,
      "depth": 2.5
    },
    {
      "id": "park_bench",
      "name": "Park Bench",
      "emoji": "🪑",
      "cost": 120,
      "refundOnErase": 60,
      "width": 2,
      "height": 1,
      "depth": 1
    },
    {
      "id": "gazebo",
      "name": "Gazebo",
      "emoji": "🛖",
      "cost": 500,
      "refundOnErase": 250,
      "width": 4,
      "height": 3,
      "depth": 4
    },
    {
      "id": "fire_pit",
      "name": "Fire Pit",
      "emoji": "🔥",
      "cost": 150,
      "refundOnErase": 75,
      "width": 1.5,
      "height": 0.5,
      "depth": 1.5
    },
    {
      "id": "picnic_table",
      "name": "Picnic Table",
      "emoji": "🪑",
      "cost": 180,
      "refundOnErase": 90,
      "width": 2.5,
      "height": 1.2,
      "depth": 2
    },
    {
      "id": "hedge",
      "name": "Hedge",
      "emoji": "🌿",
      "cost": 80,
      "refundOnErase": 40,
      "width": 2,
      "height": 1.2,
      "depth": 0.6
    },
    {
      "id": "bird_bath",
      "name": "Bird Bath",
      "emoji": "⛲",
      "cost": 90,
      "refundOnErase": 45,
      "width": 0.8,
      "height": 1,
      "depth": 0.8
    },
    {
      "id": "mailbox",
      "name": "Mailbox",
      "emoji": "📫",
      "cost": 50,
      "refundOnErase": 25,
      "width": 0.4,
      "height": 1.2,
      "depth": 0.4
    },
    {
      "id": "trash_can",
      "name": "Trash Can",
      "emoji": "🗑️",
      "cost": 40,
      "refundOnErase": 20,
      "width": 0.6,
      "height": 1,
      "depth": 0.6
    },
    {
      "id": "jeep",
      "name": "Jeep",
      "emoji": "🛻",
      "cost": 550,
      "refundOnErase": 275,
      "width": 2.6,
      "height": 1.6,
      "depth": 1.4
    }
  ],
  "mannersList": [],
  "ratingTiers": [
    {
      "name": "Lightning Fast! ⚡",
      "maxSeconds": 15,
      "stars": 3,
      "points": 100
    },
    {
      "name": "Brilliant! 🌟",
      "maxSeconds": 25,
      "stars": 2,
      "points": 50
    },
    {
      "name": "Got It! 👍",
      "maxSeconds": 999,
      "stars": 1,
      "points": 25
    }
  ]
};

export async function GET() {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    let config = await Settings.findOne({ key: "config", teacherId });
    if (!config) {
      config = await Settings.create({ key: "config", value: DEFAULT_SETTINGS, teacherId });
    } else {
      let updated = false;
      const newValue = { ...config.value };
      if (newValue.allowStudentToStopTimer === undefined) { newValue.allowStudentToStopTimer = true; updated = true; }
      if (newValue.bundleLimit === undefined) { newValue.bundleLimit = 1000; updated = true; }
      if (newValue.bundleItemName === undefined) { newValue.bundleItemName = "🍫 Chocolate"; updated = true; }
      if (newValue.weeklyTargetPoints === undefined) { newValue.weeklyTargetPoints = 5000; updated = true; }
      if (newValue.tieredRewards === undefined) {
        newValue.tieredRewards = [
          { name: "Level 1 Reward", points: 5000 },
          { name: "Level 2 Reward", points: 4750 },
          { name: "Level 3 Reward", points: 4500 }
        ];
        updated = true;
      }
      if (newValue.builderBlockCost === undefined) { newValue.builderBlockCost = 50; updated = true; }
      if (newValue.builderRoofCost === undefined) { newValue.builderRoofCost = 100; updated = true; }
      if (newValue.customColorCost === undefined) { newValue.customColorCost = DEFAULT_SETTINGS.customColorCost; updated = true; }
      if (newValue.builderBlockRefund === undefined) { newValue.builderBlockRefund = 0; updated = true; }
      if (newValue.landUpgradeCost === undefined) { newValue.landUpgradeCost = 1000; updated = true; }
      if (newValue.landUpgradeAmount === undefined) { newValue.landUpgradeAmount = 50; updated = true; }
      if (newValue.builderQuote === undefined) { newValue.builderQuote = DEFAULT_SETTINGS.builderQuote; updated = true; }
      if (newValue.builderItems === undefined) {
        newValue.builderItems = DEFAULT_SETTINGS.builderItems;
        updated = true;
      } else {
        // Add any new default items that are missing from existing config
        for (const defaultItem of DEFAULT_SETTINGS.builderItems) {
          if (!newValue.builderItems.some((i: any) => i.id === defaultItem.id)) {
            newValue.builderItems.push(defaultItem);
            updated = true;
          }
        }
      }
      if (newValue.prefabs === undefined) {
        newValue.prefabs = DEFAULT_SETTINGS.prefabs;
        updated = true;
      }
      if (newValue.mannersList === undefined) {
        newValue.mannersList = DEFAULT_SETTINGS.mannersList;
        updated = true;
      }
      if (newValue.ratingTiers === undefined || newValue.ratingTiers.length === 0) {
        newValue.ratingTiers = DEFAULT_SETTINGS.ratingTiers;
        updated = true;
      }
      if (updated) {
        config = await Settings.findOneAndUpdate({ key: "config", teacherId }, { value: newValue }, { new: true });
      }
    }
    return NextResponse.json(config?.value || DEFAULT_SETTINGS);
  } catch (error: any) {
    console.error("Settings GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings", details: error.message || error.toString() }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const value = await req.json();
    await connectToDatabase();
    const config = await Settings.findOneAndUpdate(
      { key: "config", teacherId },
      { value },
      { new: true, upsert: true }
    );
    return NextResponse.json(config.value);
  } catch (error: any) {
    console.error("Settings PUT Error:", error);
    return NextResponse.json({ error: "Failed to update settings", details: error.message || error.toString() }, { status: 500 });
  }
}
