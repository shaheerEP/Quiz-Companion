import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
  name: string;
  password?: string;
  totalSessions: number;
  lifetimePoints: number;
  pointsBalance: number;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    totalSessions: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    pointsBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);
