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
  bundleItemName: "🍫 Chocolate"
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
      if (updated) {
        config = await Settings.findOneAndUpdate({ key: "config" }, { value: newValue }, { new: true });
      }
    }
    return NextResponse.json(config.value);
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
