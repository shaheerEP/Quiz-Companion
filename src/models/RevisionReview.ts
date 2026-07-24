import mongoose, { Schema, Document, Model } from "mongoose";

// Tracks per-student spaced-repetition state for each revision note.
// Intervals follow the pattern: 1, 2, 7, 14, 30, 90 days.
export interface IRevisionReview extends Document {
  studentId: mongoose.Types.ObjectId;
  noteId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  intervalIndex: number;       // index into INTERVALS array
  nextDueDate: Date;
  lastReviewedAt?: Date;
  completed: boolean;          // true when all intervals exhausted
}

const RevisionReviewSchema = new Schema<IRevisionReview>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    noteId: { type: Schema.Types.ObjectId, ref: "RevisionNote", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    intervalIndex: { type: Number, default: 0 },
    nextDueDate: { type: Date, required: true },
    lastReviewedAt: { type: Date },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RevisionReviewSchema.index({ studentId: 1, noteId: 1 }, { unique: true });
RevisionReviewSchema.index({ studentId: 1, nextDueDate: 1 });

export const RevisionReview: Model<IRevisionReview> =
  mongoose.models.RevisionReview ||
  mongoose.model<IRevisionReview>("RevisionReview", RevisionReviewSchema);

// Canonical spaced-repetition intervals in days
export const INTERVALS = [1, 2, 7, 14, 30, 90];
