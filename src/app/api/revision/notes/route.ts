import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getTeacherId } from "@/lib/auth-helpers";
import { RevisionNote } from "@/models/RevisionNote";
import { RevisionReview, INTERVALS } from "@/models/RevisionReview";
import { Student } from "@/models/Student";
import mongoose from "mongoose";

// GET /api/revision/notes — list all notes for teacher
export async function GET(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const notes = await RevisionNote.find({ teacherId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(notes);
}

// POST /api/revision/notes — create a note and seed reviews for enabled students
export async function POST(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { front, back, subject } = await req.json();
  if (!front?.trim() || !back?.trim()) {
    return NextResponse.json({ error: "front and back are required" }, { status: 400 });
  }

  await connectToDatabase();

  const note = await RevisionNote.create({ teacherId, front: front.trim(), back: back.trim(), subject: subject?.trim() || "General" });

  // Seed review schedules for all students with revision enabled
  const enabledStudents = await Student.find({ teacherId, revisionEnabled: true }, "_id").lean();
  const now = new Date();
  if (enabledStudents.length > 0) {
    const reviews = enabledStudents.map((s) => ({
      studentId: s._id,
      noteId: note._id,
      teacherId,
      intervalIndex: 0,
      nextDueDate: addDays(now, INTERVALS[0]),
    }));
    await RevisionReview.insertMany(reviews, { ordered: false }).catch(() => {});
  }

  return NextResponse.json(note, { status: 201 });
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
