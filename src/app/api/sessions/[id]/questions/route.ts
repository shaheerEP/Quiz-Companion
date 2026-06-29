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
    const { questionNumber, responseTime, starsAwarded, points, isCorrect, compliment } = await req.json();

    if (!sessionId || questionNumber === undefined || responseTime === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    
    const newQuestionLog = await QuestionLog.create({
      sessionId,
      teacherId,
      questionNumber,
      responseTime,
      starsAwarded: isCorrect ? starsAwarded : 0,
      points: isCorrect ? points : 0,
      isCorrect
    });

    const session = await Session.findOne({ _id: sessionId, teacherId });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    
    const newTotalQuestions = session.totalQuestions + 1;
    const actualPoints = isCorrect ? points : 0;
    const newFinalScore = session.finalScore + actualPoints;
    const currentTotalTime = session.averageSpeed * session.totalQuestions;
    const newAverageSpeed = (currentTotalTime + responseTime) / newTotalQuestions;

    session.totalQuestions = newTotalQuestions;
    session.finalScore = newFinalScore;
    session.averageSpeed = newAverageSpeed;
    session.isTimerRunning = false;
    session.currentTimerStartTime = undefined;
    session.stoppedByStudent = false;
    session.studentStopTime = undefined;
    session.lastQuestionResult = {
      points: actualPoints,
      responseTime,
      isCorrect,
      stars: isCorrect ? starsAwarded : 0,
      compliment: isCorrect ? (compliment || '') : 'Incorrect!'
    };

    // Check if the session has reached the finale question count threshold to mark it completed
    const { Settings } = await import("@/models/Settings");
    const config = await Settings.findOne({ key: "config", teacherId });
    const finaleQuestionCount = config?.value?.badgeThresholds?.finaleQuestionCount || 5;
    if (newTotalQuestions >= finaleQuestionCount) {
      session.isCompleted = true;
    }

    await session.save();

    if (actualPoints > 0) {
      const student = await Student.findOne({ _id: session.studentId, teacherId });
      if (student) {
        const { updateStudentPoints } = await import("@/lib/points");
        updateStudentPoints(student, actualPoints);
        await student.save();
      }
    }

    return NextResponse.json(newQuestionLog, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log question", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await connectToDatabase();
    const questions = await QuestionLog.find({ sessionId: id, teacherId }).sort({ questionNumber: 1 });
    return NextResponse.json(questions);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch questions", details: error.message }, { status: 500 });
  }
}
