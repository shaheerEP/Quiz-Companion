import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { Session } from "@/models/Session";
import { QuestionLog } from "@/models/QuestionLog";
import { getSession } from "@/lib/auth-helpers";
import { updateStudentPoints } from "@/lib/points";

export async function POST(req: Request) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, taskId } = body;

    if (!studentId || !taskId) {
      return NextResponse.json({ error: "studentId and taskId are required" }, { status: 400 });
    }

    // Check permissions
    if (sessionUser.role === "student" && sessionUser.id !== studentId) {
      return NextResponse.json({ error: "Forbidden: You can only complete your own tasks" }, { status: 403 });
    }

    await connectToDatabase();

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (sessionUser.role === "teacher" && String(student.teacherId) !== String(sessionUser.id)) {
      return NextResponse.json({ error: "Forbidden: Not your student" }, { status: 403 });
    }

    if (!student.tasks || student.tasks.length === 0) {
      return NextResponse.json({ error: "No tasks found for student" }, { status: 404 });
    }

    const task = student.tasks.find((t: any) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if non-repeatable and already completed
    if (!task.isRepeatable && task.completed) {
      return NextResponse.json(
        { error: "This task is non-repeatable and has already been completed." },
        { status: 400 }
      );
    }

    const pointsAwarded = Math.max(1, task.points || 10);

    // 1. Update Student Points (Balance, Lifetime, Daily, Weekly)
    updateStudentPoints(student, pointsAwarded);

    // 2. Find or create an active Session to attach the history log
    let session = await Session.findOne({
      studentId: student._id,
      teacherId: student.teacherId,
      isCompleted: false,
    }).sort({ createdAt: -1 });

    if (!session) {
      session = await Session.create({
        studentId: student._id,
        teacherId: student.teacherId,
        date: new Date(),
        finalScore: 0,
        totalQuestions: 0,
        isCompleted: false,
      });
    }

    session.finalScore = Math.max(0, session.finalScore + pointsAwarded);
    await session.save();

    // 3. Create QuestionLog with 'bonus' so it appears in Daily/Weekly History
    await QuestionLog.create({
      sessionId: session._id,
      teacherId: student.teacherId,
      logType: "bonus",
      points: pointsAwarded,
      isCorrect: true,
      date: new Date(),
    });

    // 4. Update task state
    task.completed = true;
    task.lastCompletedAt = new Date();
    task.completedCount = (task.completedCount || 0) + 1;

    student.markModified("tasks");
    await student.save();

    return NextResponse.json({
      success: true,
      pointsAwarded,
      message: `🎉 Great job! +${pointsAwarded} pts awarded for: "${task.title}"`,
      student,
      task,
    });
  } catch (error: any) {
    console.error("POST /api/tasks/complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete task", details: error.message },
      { status: 500 }
    );
  }
}
