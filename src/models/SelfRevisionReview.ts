import mongoose, { Schema, Document, Model } from "mongoose";
import "@/models/SelfRevisionNote";

export const INTERVALS = [1, 2, 7, 14, 30, 90];

export interface ISelfRevisionReview extends Document {
  studentId: mongoose.Types.ObjectId;
  noteId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  intervalIndex: number;
  currentInterval: number;
  nextDueDate: Date;
  lastReviewedAt?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SelfRevisionReviewSchema = new Schema<ISelfRevisionReview>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    noteId: { type: Schema.Types.ObjectId, ref: "SelfRevisionNote", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    intervalIndex: { type: Number, default: 0 },
    nextDueDate: { type: Date, required: true },
    lastReviewedAt: { type: Date },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SelfRevisionReviewSchema.index({ studentId: 1, noteId: 1 }, { unique: true });
SelfRevisionReviewSchema.index({ studentId: 1, nextDueDate: 1 });

export const SelfRevisionReview: Model<ISelfRevisionReview> =
  mongoose.models.SelfRevisionReview ||
  mongoose.model<ISelfRevisionReview>("SelfRevisionReview", SelfRevisionReviewSchema);
