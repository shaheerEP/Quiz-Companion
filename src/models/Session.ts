import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  studentId: mongoose.Types.ObjectId;
  date: Date;
  totalQuestions: number;
  finalScore: number;
  averageSpeed: number;
  isCompleted: boolean;
  currentTimerStartTime?: number;
  isTimerRunning: boolean;
  studentStopTime?: number;
  stoppedByStudent: boolean;
  lastQuestionResult?: {
    points: number;
    responseTime: number;
    isCorrect: boolean;
    stars: number;
  };
}

const SessionSchema = new Schema<ISession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, default: Date.now },
    totalQuestions: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    averageSpeed: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    currentTimerStartTime: { type: Number, default: null },
    isTimerRunning: { type: Boolean, default: false },
    studentStopTime: { type: Number, default: null },
    stoppedByStudent: { type: Boolean, default: false },
    lastQuestionResult: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);
