import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";

export async function POST() {
  try {
    await connectToDatabase();
    
    // Clear existing
    await Student.deleteMany({});
    await Session.deleteMany({});
    await QuestionLog.deleteMany({});
    
    // Seed new
    await Student.create([
      { name: "Alex" },
      { name: "Jordan" },
      { name: "Sam" }
    ]);
    
    return NextResponse.json({ message: "Database seeded successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}
