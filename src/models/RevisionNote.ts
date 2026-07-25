import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRevisionNote extends Document {
  teacherId: mongoose.Types.ObjectId;
  front: string;
  back: string;
  subject?: string;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RevisionNoteSchema = new Schema<IRevisionNote>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    front: { type: String, required: true, trim: true },
    back: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    explanation: { type: String, trim: true },
  },
  { timestamps: true }
);

RevisionNoteSchema.index({ teacherId: 1, createdAt: -1 });

export const RevisionNote: Model<IRevisionNote> =
  mongoose.models.RevisionNote ||
  mongoose.model<IRevisionNote>("RevisionNote", RevisionNoteSchema);
