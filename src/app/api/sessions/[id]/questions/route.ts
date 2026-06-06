import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";
import { Student } from "@/models/Student";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const sessionId = id;
    const { questionNumber, responseTime, starsAwarded, points } = await req.json();

    if (!sessionId || questionNumber === undefined || responseTime === undefined || starsAwarded === undefined || points === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Log the question
    const newQuestionLog = await QuestionLog.create({
      sessionId,
      questionNumber,
      responseTime,
      starsAwarded,
      points
    });

    // Update Session
    const session = await Session.findById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    
    const newTotalQuestions = session.totalQuestions + 1;
    const newFinalScore = session.finalScore + points;
    // Calculate new average speed
    const currentTotalTime = session.averageSpeed * session.totalQuestions;
    const newAverageSpeed = (currentTotalTime + responseTime) / newTotalQuestions;

    session.totalQuestions = newTotalQuestions;
    session.finalScore = newFinalScore;
    session.averageSpeed = newAverageSpeed;
    await session.save();

    // Update Student allTimeScore
    await Student.findByIdAndUpdate(session.studentId, { $inc: { allTimeScore: points } });

    return NextResponse.json(newQuestionLog, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log question", details: error.message }, { status: 500 });
  }
}
