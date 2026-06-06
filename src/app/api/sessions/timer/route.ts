import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";

export async function PUT(req: Request) {
  try {
    const { sessionId, isTimerRunning } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    await connectToDatabase();
    const session = await Session.findById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    session.isTimerRunning = isTimerRunning;
    if (isTimerRunning) {
      session.currentTimerStartTime = Date.now();
    } else {
      session.currentTimerStartTime = undefined;
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
      currentTimerStartTime: session.currentTimerStartTime 
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch timer state" }, { status: 500 });
  }
}
