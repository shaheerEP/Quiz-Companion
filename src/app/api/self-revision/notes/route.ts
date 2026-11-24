import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getSession } from "@/lib/auth-helpers";
import { SelfRevisionNote } from "@/models/SelfRevisionNote";
import { SelfRevisionReview, INTERVALS } from "@/models/SelfRevisionReview";
import { Student } from "@/models/Student";

// Helper to determine active studentId and teacherId from session
async function resolveAuth(req: NextRequest) {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "student") {
    const studentId = session.id;
    const teacherId = session.teacherId;
    return { role: "student", studentId, teacherId };
  }

  if (session.role === "teacher" || session.role === "admin") {
    const teacherId = session.role === "teacher" ? (session.teacherId || session.id) : null;
    const requestedStudentId = req.nextUrl.searchParams.get("studentId");
    return { role: session.role, studentId: requestedStudentId, teacherId };
  }

  return null;
}

// GET /api/self-revision/notes?studentId=xxx
export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = auth.studentId;
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  await connectToDatabase();

  const notes = await SelfRevisionNote.find({ studentId }).sort({ createdAt: -1 }).lean();
  const reviews = await SelfRevisionReview.find({ studentId }).lean();
  const reviewByNote = new Map(reviews.map((r) => [String(r.noteId), r]));
  const now = new Date();

  // Get student's custom intervals if configured
  const student = await Student.findById(studentId).lean();
  const intervals = student?.revisionRewindDays?.length ? student.revisionRewindDays : INTERVALS;

  const enriched = notes.map((n) => {
    const r = reviewByNote.get(String(n._id));
    let status: "due" | "upcoming" | "done" = "upcoming";
    let nextDueDate: Date | null = null;
    let intervalIndex = 0;

    if (r) {
      intervalIndex = r.intervalIndex;
      nextDueDate = r.nextDueDate;
      if (r.completed) {
        status = "done";
      } else if (!r.lastReviewedAt || new Date(r.nextDueDate) <= now) {
        status = "due";
      } else {
        status = "upcoming";
      }
    }

    return {
      ...n,
      review: r
        ? {
            _id: r._id,
            status,
            intervalIndex,
            currentInterval: intervals[intervalIndex] ?? intervals[0],
            nextDueDate,
            completed: r.completed,
          }
        : null,
    };
  });

  return NextResponse.json(enriched);
}

// POST /api/self-revision/notes
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { front, back, subject, explanation } = body;
  let targetStudentId = body.studentId;

  if (session.role === "student") {
    targetStudentId = session.id;
  }

  if (!targetStudentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  if (!front?.trim() || !back?.trim()) {
    return NextResponse.json({ error: "front and back are required" }, { status: 400 });
  }

  await connectToDatabase();

  const student = await Student.findById(targetStudentId);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const teacherId = student.teacherId;

  const note = await SelfRevisionNote.create({
    studentId: targetStudentId,
    teacherId,
    front: front.trim(),
    back: back.trim(),
    subject: subject?.trim() || undefined,
    explanation: explanation?.trim() || undefined,
  });

  // Seed review schedule immediately
  const now = new Date();
  await SelfRevisionReview.create({
    studentId: targetStudentId,
    noteId: note._id,
    teacherId,
    intervalIndex: 0,
    nextDueDate: now,
  }).catch(() => {});

  return NextResponse.json(note, { status: 201 });
}

// PUT /api/self-revision/notes
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId, front, back, subject, explanation } = await req.json();
  if (!noteId || !front?.trim() || !back?.trim()) {
    return NextResponse.json({ error: "noteId, front, and back are required" }, { status: 400 });
  }

  await connectToDatabase();

  const filter: any = { _id: noteId };
  if (session.role === "student") {
    filter.studentId = session.id;
  }

  const note = await SelfRevisionNote.findOneAndUpdate(
    filter,
    {
      front: front.trim(),
      back: back.trim(),
      subject: subject?.trim() || undefined,
      explanation: explanation?.trim() || undefined,
    },
    { new: true }
  );

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json(note);
}

// DELETE /api/self-revision/notes
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  await connectToDatabase();

  const filter: any = { _id: noteId };
  if (session.role === "student") {
    filter.studentId = session.id;
  }

  const deleted = await SelfRevisionNote.findOneAndDelete(filter);
  if (deleted) {
    await SelfRevisionReview.deleteMany({ noteId });
  }

  return NextResponse.json({ ok: true });
}
