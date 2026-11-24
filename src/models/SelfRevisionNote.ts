import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISelfRevisionNote extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  front: string;
  back: string;
  subject?: string;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SelfRevisionNoteSchema = new Schema<ISelfRevisionNote>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    front: { type: String, required: true, trim: true },
    back: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    explanation: { type: String, trim: true },
  },
  { timestamps: true }
);

SelfRevisionNoteSchema.index({ studentId: 1, createdAt: -1 });
SelfRevisionNoteSchema.index({ teacherId: 1, studentId: 1 });

export const SelfRevisionNote: Model<ISelfRevisionNote> =
  mongoose.models.SelfRevisionNote ||
  mongoose.model<ISelfRevisionNote>("SelfRevisionNote", SelfRevisionNoteSchema);
