import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
  name: string;
  totalSessions: number;
  allTimeScore: number;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, unique: true },
    totalSessions: { type: Number, default: 0 },
    allTimeScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);
