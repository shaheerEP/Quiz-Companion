import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMannersLog extends Document {
  studentId: mongoose.Types.ObjectId;
  date: Date;
  tasks: {
    task: string;
    taskId: string;
    stars: number;
    maxStars: number;
  }[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

const MannersLogSchema = new Schema<IMannersLog>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true },
    tasks: {
      type: [
        {
          task: String,
          taskId: String,
          stars: Number,
          maxStars: Number,
        }
      ],
      default: []
    },
    totalScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { timestamps: true }
);

// Ensure one log per student per day
MannersLogSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const MannersLog: Model<IMannersLog> =
  mongoose.models.MannersLog || mongoose.model<IMannersLog>("MannersLog", MannersLogSchema);
