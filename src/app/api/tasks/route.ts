import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Student } from "@/models/Student";
import { getSession, getTeacherId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    // Check authorization: must be student themselves or teacher
    if (session.role === "student" && session.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const todayStr = new Date().toDateString();
    const tasksWithTodayStatus = (student.tasks || []).map((t: any) => {
      const isCompletedToday = Boolean(
        t.lastCompletedAt && new Date(t.lastCompletedAt).toDateString() === todayStr
      );
      return {
        ...t.toObject ? t.toObject() : t,
        completedToday: isCompletedToday,
      };
    });

    return NextResponse.json({ tasks: tasksWithTodayStatus });
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized. Teacher only." }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, title, points, isRepeatable } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const pointVal = Math.max(1, parseInt(points, 10) || 10);
    const repeatable = Boolean(isRepeatable);

    await connectToDatabase();

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTask = {
      id: taskId,
      title: title.trim(),
      points: pointVal,
      isRepeatable: repeatable,
      completed: false,
      completedCount: 0,
      createdAt: new Date(),
    };

    if (studentId === "all") {
      // Assign to all students of this teacher
      await Student.updateMany(
        { teacherId },
        { $push: { tasks: newTask } }
      );
      return NextResponse.json({ success: true, message: "Task assigned to all students", task: newTask });
    } else {
      if (!studentId) {
        return NextResponse.json({ error: "studentId is required" }, { status: 400 });
      }
      const student = await Student.findOne({ _id: studentId, teacherId });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      if (!student.tasks) student.tasks = [];
      student.tasks.push(newTask);
      await student.save();

      return NextResponse.json({ success: true, tasks: student.tasks, task: newTask });
    }
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized. Teacher only." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const taskId = searchParams.get("taskId");

    if (!studentId || !taskId) {
      return NextResponse.json({ error: "Missing studentId or taskId" }, { status: 400 });
    }

    await connectToDatabase();

    if (studentId === "all") {
      await Student.updateMany(
        { teacherId },
        { $pull: { tasks: { id: taskId } } }
      );
      return NextResponse.json({ success: true, message: "Task removed from all students" });
    }

    const student = await Student.findOne({ _id: studentId, teacherId });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    student.tasks = (student.tasks || []).filter((t: any) => t.id !== taskId);
    await student.save();

    return NextResponse.json({ success: true, tasks: student.tasks });
  } catch (error: any) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to delete task", details: error.message }, { status: 500 });
  }
}
