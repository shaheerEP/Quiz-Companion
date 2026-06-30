import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";
import { Student } from "@/models/Student";
import { getTeacherId } from "@/lib/auth-helpers";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const sessionId = id;
    const { logType, points, date } = await req.json();

    if (!sessionId || !logType || points === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    
    const newLog = await QuestionLog.create({
      sessionId,
      teacherId,
      logType,
      points,
      isCorrect: logType === 'bonus',
      ...(date && { date: new Date(date) })
    });

    const session = await Session.findOne({ _id: sessionId, teacherId });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    
    // Add manual points to final score? 
    // Usually manual points just go to the student's balance, but we can add it to the final score of the quiz.
    // If it's a deduction, points will be passed as a positive number (points to deduct), so we subtract it from finalScore.
    const actualPoints = logType === 'bonus' ? points : -points;
    session.finalScore = Math.max(0, session.finalScore + actualPoints);
    await session.save();

    const student = await Student.findOne({ _id: session.studentId, teacherId });
    if (student) {
      const { updateStudentPoints } = await import("@/lib/points");
      updateStudentPoints(student, actualPoints, date ? new Date(date) : undefined);
      await student.save();
    }

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log manual points", details: error.message }, { status: 500 });
  }
}
