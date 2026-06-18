import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { Student } from "@/models/Student";
import { getTeacherId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    await connectToDatabase();
    
    const query: any = { teacherId };
    if (studentId) query.studentId = studentId;
    const sessions = await Session.find(query).sort({ date: -1 });
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { studentId } = await req.json();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectToDatabase();
    
    // Mark previous incomplete sessions as completed
    await Session.updateMany(
      { studentId, teacherId, isCompleted: false },
      { $set: { isCompleted: true } }
    );

    const newSession = await Session.create({ studentId, teacherId });
    
    // Increment totalSessions for the student
    await Student.findOneAndUpdate({ _id: studentId, teacherId }, { $inc: { totalSessions: 1 } });
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
