import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getTeacherId } from "@/lib/auth-helpers";
import { RevisionNote } from "@/models/RevisionNote";
import { RevisionReview, INTERVALS } from "@/models/RevisionReview";
import { Student } from "@/models/Student";

// GET /api/revision/notes?studentId=xxx — notes with per-card review state for that student
export async function GET(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");

  await connectToDatabase();
  const notes = await RevisionNote.find({ teacherId }).sort({ createdAt: -1 }).lean();

  if (!studentId) return NextResponse.json(notes);

  // Attach per-card review status for the selected student
  const reviews = await RevisionReview.find({ teacherId, studentId }).lean();
  const reviewByNote = new Map(reviews.map((r) => [String(r.noteId), r]));
  const now = new Date();

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
    } else {
      // No review record yet
      status = "upcoming";
    }

    return {
      ...n,
      review: r
        ? {
            status,
            intervalIndex,
            currentInterval: INTERVALS[intervalIndex],
            nextDueDate,
            completed: r.completed,
          }
        : null,
    };
  });

  return NextResponse.json(enriched);
}

// POST /api/revision/notes — create a note and seed reviews for enabled students
export async function POST(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { front, back, subject, explanation, studentId } = await req.json();
  if (!front?.trim() || !back?.trim()) {
    return NextResponse.json({ error: "front and back are required" }, { status: 400 });
  }

  await connectToDatabase();

  const note = await RevisionNote.create({
    teacherId,
    front: front.trim(),
    back: back.trim(),
    subject: subject?.trim() || undefined,
    explanation: explanation?.trim() || undefined,
  });

  // Seed review schedule for the specific student (if provided and enabled),
  // otherwise seed all enabled students
  const now = new Date();
  if (studentId) {
    const student = await Student.findOne({ _id: studentId, teacherId, revisionEnabled: true }, "_id").lean();
    if (student) {
      await RevisionReview.create({
        studentId,
        noteId: note._id,
        teacherId,
        intervalIndex: 0,
        nextDueDate: now, // Due immediately for initial review
      }).catch(() => {});
    }
  } else {
    const enabledStudents = await Student.find({ teacherId, revisionEnabled: true }, "_id").lean();
    if (enabledStudents.length > 0) {
      const reviews = enabledStudents.map((s) => ({
        studentId: s._id,
        noteId: note._id,
        teacherId,
        intervalIndex: 0,
        nextDueDate: now, // Due immediately for initial review
      }));
      await RevisionReview.insertMany(reviews, { ordered: false }).catch(() => {});
    }
  }

  return NextResponse.json(note, { status: 201 });
}

// PUT /api/revision/notes — update an existing note
export async function PUT(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId, front, back, subject, explanation } = await req.json();
  if (!noteId || !front?.trim() || !back?.trim()) {
    return NextResponse.json({ error: "noteId, front, and back are required" }, { status: 400 });
  }

  await connectToDatabase();

  const note = await RevisionNote.findOneAndUpdate(
    { _id: noteId, teacherId },
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

// DELETE /api/revision/notes — delete a note and its reviews
export async function DELETE(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  await connectToDatabase();
  await RevisionNote.deleteOne({ _id: noteId, teacherId });
  await RevisionReview.deleteMany({ noteId, teacherId });
  return NextResponse.json({ ok: true });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
