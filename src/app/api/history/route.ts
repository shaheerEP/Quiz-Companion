import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";
import { getTeacherId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch all sessions to get the session IDs for this student
    const allSessions = await Session.find({ studentId, teacherId });
    const allSessionIds = allSessions.map((s) => s._id);

    // Fetch all logs (questions, bonuses, deductions) for these sessions
    const allLogs = await QuestionLog.find({
      sessionId: { $in: allSessionIds },
      teacherId
    });

    const historyItems: any[] = [];

    for (const log of allLogs) {
      const logDate = log.date || (log as any).createdAt || new Date();
      if (log.logType === 'bonus') {
        historyItems.push({
          _id: log._id.toString(),
          type: 'bonus',
          date: logDate,
          points: log.points,
          title: 'Manual Bonus',
          details: ''
        });
      } else if (log.logType === 'deduction') {
        historyItems.push({
          _id: log._id.toString(),
          type: 'deduction',
          date: logDate,
          points: log.points,
          title: 'Manual Deduction',
          details: ''
        });
      } else {
        // Normal question
        historyItems.push({
          _id: log._id.toString(),
          type: 'quiz',
          date: logDate,
          points: log.points,
          title: `Question ${log.questionNumber || 0}`,
          details: `${log.isCorrect ? 'Correct' : 'Incorrect'} (${log.responseTime?.toFixed(1) || 0}s)`
        });
      }
    }

    // Sort by date descending (newest first)
    historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(historyItems, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
