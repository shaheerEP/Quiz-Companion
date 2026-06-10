import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { Student } from "@/models/Student";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    await connectToDatabase();
    
    const query = studentId ? { studentId } : {};
    const sessions = await Session.find(query).sort({ date: -1 });
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId } = await req.json();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectToDatabase();
    
    // Mark previous incomplete sessions as completed
    await Session.updateMany(
      { studentId, isCompleted: false },
      { $set: { isCompleted: true } }
    );

    const newSession = await Session.create({ studentId });
    
    // Increment totalSessions for the student
    await Student.findByIdAndUpdate(studentId, { $inc: { totalSessions: 1 } });
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
