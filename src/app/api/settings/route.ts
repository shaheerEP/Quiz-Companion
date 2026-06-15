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
  builderColors: [
    { id: "wood", color: "#8B5A2B", name: "Wood", cost: 0 },
    { id: "stone", color: "#808080", name: "Stone", cost: 0 },
    { id: "brick", color: "#B22222", name: "Brick", cost: 100 },
    { id: "glass", color: "#ADD8E6", name: "Glass", cost: 200 },
  ],
  builderBlockRefund: 0,
  builderItems: [
    { id: "tree", name: "Tree", emoji: "🌲", cost: 100, refundOnErase: 50, width: 1, height: 2.5, depth: 1 },
    { id: "flower", name: "Flower", emoji: "🌸", cost: 50, refundOnErase: 25, width: 0.5, height: 0.6, depth: 0.5 },
    { id: "car", name: "Car", emoji: "🚗", cost: 200, refundOnErase: 100, width: 2.5, height: 1, depth: 1.2 },
    { id: "lamp", name: "Lamp Post", emoji: "🏮", cost: 75, refundOnErase: 35, width: 0.4, height: 2.5, depth: 0.4 },
    { id: "fence", name: "Fence", emoji: "🏗️", cost: 30, refundOnErase: 15, width: 1.5, height: 0.8, depth: 0.15 },
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
      if (newValue.builderColors === undefined) { newValue.builderColors = DEFAULT_SETTINGS.builderColors; updated = true; }
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
