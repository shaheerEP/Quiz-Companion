import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getTeacherId } from "@/lib/auth-helpers";
import { Student } from "@/models/Student";
import { RevisionReview, INTERVALS } from "@/models/RevisionReview";
import { RevisionNote } from "@/models/RevisionNote";

// PUT /api/revision/student-settings
// Body: { studentId, revisionEnabled, rewindDays }
// - enables/disables revision for a student
// - seeds or removes their review schedules accordingly
export async function PUT(req: NextRequest) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, revisionEnabled, rewindDays } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  await connectToDatabase();

  const student = await Student.findOne({ _id: studentId, teacherId });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const wasEnabled = (student as any).revisionEnabled ?? false;
  (student as any).revisionEnabled = revisionEnabled;
  if (rewindDays !== undefined) (student as any).revisionRewindDays = rewindDays;
  await student.save();

  // If enabling for first time, seed all existing notes
  if (revisionEnabled && !wasEnabled) {
    const notes = await RevisionNote.find({ teacherId }, "_id").lean();
    const now = new Date();
    const reviews = notes.map((n) => ({
      studentId,
      noteId: n._id,
      teacherId,
      intervalIndex: 0,
      nextDueDate: addDays(now, INTERVALS[0]),
    }));
    if (reviews.length > 0) {
      await RevisionReview.insertMany(reviews, { ordered: false }).catch(() => {});
    }
  }

  // If disabling, remove all pending review records
  if (!revisionEnabled && wasEnabled) {
    await RevisionReview.deleteMany({ studentId, teacherId });
  }

  return NextResponse.json({ ok: true });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
