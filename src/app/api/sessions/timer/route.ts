import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";

export async function PUT(req: Request) {
  try {
    const { sessionId, isTimerRunning, studentStopTime, stoppedByStudent, cancelled, teacherStopTime } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    await connectToDatabase();
    const session = await Session.findById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    session.isTimerRunning = isTimerRunning;
    if (isTimerRunning) {
      session.currentTimerStartTime = Date.now();
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
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    await connectToDatabase();
    const session = await Session.findById(sessionId);
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
