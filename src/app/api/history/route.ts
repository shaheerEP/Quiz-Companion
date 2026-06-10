import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch all sessions (completed and active) to find all manual logs
    const allSessions = await Session.find({ studentId });
    const allSessionIds = allSessions.map((s) => s._id);

    // Fetch completed sessions
    const completedSessions = allSessions.filter(s => s.isCompleted);

    // Fetch manual logs (bonus and deduction)
    const manualLogs = await QuestionLog.find({
      sessionId: { $in: allSessionIds },
      logType: { $in: ['bonus', 'deduction'] }
    });

    const historyItems: any[] = [];

    // Process completed sessions
    for (const session of completedSessions) {
      // Find manual logs for THIS session to calculate raw question points
      const sessionManualLogs = manualLogs.filter(log => log.sessionId.toString() === session._id.toString());
      
      let netManualPoints = 0;
      for (const log of sessionManualLogs) {
        if (log.logType === 'bonus') netManualPoints += log.points;
        if (log.logType === 'deduction') netManualPoints -= log.points;
      }

      // We ensure it doesn't go below 0 (just in case)
      const rawQuestionPoints = Math.max(0, session.finalScore - netManualPoints);

      historyItems.push({
        _id: session._id.toString(),
        type: 'quiz',
        date: session.date || new Date(), // Use session.date instead of createdAt
        points: rawQuestionPoints,
        title: 'Quiz Completed',
        details: `${session.totalQuestions} questions`
      });
    }

    // Process manual logs
    for (const log of manualLogs) {
      historyItems.push({
        _id: log._id.toString(),
        type: log.logType, // 'bonus' | 'deduction'
        date: (log as any).createdAt || new Date(),
        points: log.points,
        title: log.logType === 'bonus' ? 'Manual Bonus' : 'Manual Deduction',
        details: ''
      });
    }

    // Sort by date descending (newest first)
    historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(historyItems, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
