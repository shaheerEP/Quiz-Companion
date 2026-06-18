import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { getTeacherId } from "@/lib/auth-helpers";

export async function PUT(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sessionId, isTimerRunning, studentStopTime, stoppedByStudent, cancelled, teacherStopTime, teacherStartTime } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    await connectToDatabase();
    const session = await Session.findOne({ _id: sessionId, teacherId });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    session.isTimerRunning = isTimerRunning;
    if (isTimerRunning) {
      session.currentTimerStartTime = teacherStartTime || Date.now();
      session.studentStopTime = undefined;
      session.stoppedByStudent = false;
      session.lastQuestionResult = undefined;
    } else {
      if (cancelled) {
        session.stoppedByStudent = false;
        session.studentStopTime = undefined;
        session.currentTimerStartTime = undefined;
        session.lastQuestionResult = { cancelled: true };
      } else if (stoppedByStudent !== undefined) {
        session.stoppedByStudent = stoppedByStudent;
        session.studentStopTime = studentStopTime;
      } else if (teacherStopTime !== undefined) {
        session.stoppedByStudent = false;
        session.studentStopTime = teacherStopTime;
        session.currentTimerStartTime = undefined;
      } else {
        session.currentTimerStartTime = undefined;
        session.stoppedByStudent = false;
        session.studentStopTime = undefined;
      }
    }

    await session.save();
    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update timer", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    await connectToDatabase();
    const session = await Session.findOne({ _id: sessionId, teacherId });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json({ 
      isTimerRunning: session.isTimerRunning, 
      currentTimerStartTime: session.currentTimerStartTime,
      stoppedByStudent: session.stoppedByStudent,
      studentStopTime: session.studentStopTime,
      lastQuestionResult: session.lastQuestionResult || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch timer state" }, { status: 500 });
  }
}
