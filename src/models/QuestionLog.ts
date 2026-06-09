import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestionLog extends Document {
  sessionId: mongoose.Types.ObjectId;
  logType?: 'question' | 'bonus' | 'deduction';
  questionNumber?: number;
  responseTime?: number;
  starsAwarded?: number;
  points: number;
  isCorrect?: boolean;
}

const QuestionLogSchema = new Schema<IQuestionLog>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    logType: { type: String, enum: ['question', 'bonus', 'deduction'], default: 'question' },
    questionNumber: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }, // in seconds
    starsAwarded: { type: Number, default: 0 },
    points: { type: Number, required: true },
    isCorrect: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const QuestionLog: Model<IQuestionLog> =
  mongoose.models.QuestionLog ||
  mongoose.model<IQuestionLog>("QuestionLog", QuestionLogSchema);
