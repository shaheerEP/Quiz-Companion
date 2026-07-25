import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getSession } from "@/lib/auth-helpers";
import { RevisionReview, INTERVALS } from "@/models/RevisionReview";
import { RevisionNote } from "@/models/RevisionNote";
import { Student } from "@/models/Student";

// GET /api/revision/due?studentId=xxx — returns notes due today for a student
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  await connectToDatabase();
  // Ensure RevisionNote model is registered in Mongoose
  const _ensureNoteSchema = RevisionNote;

  const student = await Student.findById(studentId).lean();
  const intervals = student?.revisionRewindDays?.length ? student.revisionRewindDays : INTERVALS;

  const now = new Date();
  const reviews = await RevisionReview.find({
    studentId,
    $or: [
      { nextDueDate: { $lte: now } },
      { lastReviewedAt: { $exists: false } },
      { lastReviewedAt: null }
    ],
    completed: false,
  })
    .populate("noteId")
    .lean();

  return NextResponse.json(
    reviews.map((r) => ({
      reviewId: r._id,
      noteId: (r.noteId as any)?._id,
      front: (r.noteId as any)?.front,
      back: (r.noteId as any)?.back,
      explanation: (r.noteId as any)?.explanation,
      subject: (r.noteId as any)?.subject,
      intervalIndex: r.intervalIndex,
      currentInterval: intervals[r.intervalIndex] ?? intervals[intervals.length - 1],
      nextInterval: intervals[r.intervalIndex + 1] ?? null,
    }))
  );
}

// POST /api/revision/due — mark a review as done with rating ("bad" | "good" | "awesome" | "excellent")
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, rating } = await req.json();
  if (!reviewId) return NextResponse.json({ error: "reviewId required" }, { status: 400 });

  await connectToDatabase();

  const review = await RevisionReview.findById(reviewId);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const student = await Student.findById(review.studentId).lean();
  const intervals = student?.revisionRewindDays?.length ? student.revisionRewindDays : INTERVALS;

  const now = new Date();

  let stepAdvance = 1;
  if (rating === "bad") {
    stepAdvance = 0;
  } else if (rating === "good") {
    stepAdvance = 1;
  } else if (rating === "awesome") {
    stepAdvance = 2;
  } else if (rating === "excellent") {
    stepAdvance = 3;
  }

  if (rating === "bad") {
    review.intervalIndex = 0;
    review.nextDueDate = addDays(now, intervals[0] || 1);
    review.lastReviewedAt = now;
  } else {
    const nextIndex = Math.min(review.intervalIndex + stepAdvance, intervals.length - 1);
    if (review.intervalIndex + stepAdvance >= intervals.length) {
      review.completed = true;
      review.lastReviewedAt = now;
    } else {
      review.intervalIndex = nextIndex;
      review.nextDueDate = addDays(now, intervals[nextIndex]);
      review.lastReviewedAt = now;
    }
  }

  await review.save();
  return NextResponse.json({ ok: true, completed: review.completed, nextDueDate: review.nextDueDate });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
