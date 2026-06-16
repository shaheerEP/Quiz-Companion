import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Settings } from "@/models/Settings";

const DEFAULT_SETTINGS = {
  ratingTiers: [
    { name: "Lightning Fast! ⚡", maxSeconds: 5, stars: 3, points: 100 },
    { name: "Brilliant! 🌟", maxSeconds: 12, stars: 2, points: 50 },
    { name: "Got It! 👍", maxSeconds: 999, stars: 1, points: 25 },
  ],
  mysteryGifts: [
    "10 mins of free game time",
    "Pick next theme",
    "No homework tonight",
    "Choose the next topic"
  ],
  badgeThresholds: {
    speedThreshold: 8,
    finaleQuestionCount: 5,
  },
  allowStudentToStopTimer: true,
  bundleLimit: 1000,
  bundleItemName: "🍫 Chocolate",
  builderBlockCost: 50,
  builderRoofCost: 100,
  customColorCost: 100,
  builderBlockRefund: 0,
  builderItems: [
    { id: "tree", name: "Tree", emoji: "🌲", cost: 100, refundOnErase: 50, width: 1, height: 2.5, depth: 1 },
    { id: "flower", name: "Flower", emoji: "🌸", cost: 50, refundOnErase: 25, width: 0.5, height: 0.6, depth: 0.5 },
    { id: "car", name: "Car", emoji: "🚗", cost: 200, refundOnErase: 100, width: 2.5, height: 1, depth: 1.2 },
    { id: "lamp", name: "Lamp Post", emoji: "🏮", cost: 75, refundOnErase: 35, width: 0.4, height: 2.5, depth: 0.4 },
    { id: "fence", name: "Fence", emoji: "🏗️", cost: 30, refundOnErase: 15, width: 1.5, height: 0.8, depth: 0.15 },
    { id: "cat", name: "Cat", emoji: "🐈", cost: 100, refundOnErase: 50, width: 0.5, height: 0.6, depth: 0.8 },
    { id: "horse", name: "Horse", emoji: "🐎", cost: 300, refundOnErase: 150, width: 1.0, height: 2.0, depth: 2.2 },
    { id: "cow", name: "Cow", emoji: "🐄", cost: 250, refundOnErase: 125, width: 1.2, height: 1.8, depth: 2.0 },
    { id: "goat", name: "Goat", emoji: "🐐", cost: 150, refundOnErase: 75, width: 0.8, height: 1.2, depth: 1.4 },
    { id: "dog", name: "Dog", emoji: "🐕", cost: 120, refundOnErase: 60, width: 0.6, height: 0.8, depth: 1.0 },
    { id: "pig", name: "Pig", emoji: "🐖", cost: 150, refundOnErase: 75, width: 0.8, height: 1.0, depth: 1.5 },
    { id: "chicken", name: "Chicken", emoji: "🐓", cost: 80, refundOnErase: 40, width: 0.4, height: 0.5, depth: 0.5 },
    { id: "bench", name: "Bench", emoji: "🪑", cost: 80, refundOnErase: 40, width: 2.0, height: 0.8, depth: 0.8 },
    { id: "bush", name: "Bush", emoji: "🌿", cost: 60, refundOnErase: 30, width: 1.0, height: 1.0, depth: 1.0 },
    { id: "rock", name: "Rock", emoji: "🪨", cost: 50, refundOnErase: 25, width: 1.0, height: 0.8, depth: 1.0 },
    { id: "bed", name: "Bed", emoji: "🛏️", cost: 150, refundOnErase: 75, width: 1.5, height: 0.5, depth: 2.0 },
    { id: "table", name: "Table", emoji: "🪑", cost: 120, refundOnErase: 60, width: 2.0, height: 1.0, depth: 2.0 },
  ]
};

export async function GET() {
  try {
    await connectToDatabase();
    let config = await Settings.findOne({ key: "config" });
    if (!config) {
      config = await Settings.create({ key: "config", value: DEFAULT_SETTINGS });
    } else {
      let updated = false;
      const newValue = { ...config.value };
      if (newValue.allowStudentToStopTimer === undefined) { newValue.allowStudentToStopTimer = true; updated = true; }
      if (newValue.bundleLimit === undefined) { newValue.bundleLimit = 1000; updated = true; }
      if (newValue.bundleItemName === undefined) { newValue.bundleItemName = "🍫 Chocolate"; updated = true; }
      if (newValue.builderBlockCost === undefined) { newValue.builderBlockCost = 50; updated = true; }
      if (newValue.builderRoofCost === undefined) { newValue.builderRoofCost = 100; updated = true; }
      if (newValue.customColorCost === undefined) { newValue.customColorCost = DEFAULT_SETTINGS.customColorCost; updated = true; }
      if (newValue.builderBlockRefund === undefined) { newValue.builderBlockRefund = 0; updated = true; }
      if (newValue.builderItems === undefined) { newValue.builderItems = DEFAULT_SETTINGS.builderItems; updated = true; }
      if (updated) {
        config = await Settings.findOneAndUpdate({ key: "config" }, { value: newValue }, { new: true });
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
    const value = await req.json();
    await connectToDatabase();
    const config = await Settings.findOneAndUpdate(
      { key: "config" },
      { value },
      { new: true, upsert: true }
    );
    return NextResponse.json(config.value);
  } catch (error: any) {
    console.error("Settings PUT Error:", error);
    return NextResponse.json({ error: "Failed to update settings", details: error.message || error.toString() }, { status: 500 });
  }
}
