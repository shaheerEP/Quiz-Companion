import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestionLog extends Document {
  sessionId: mongoose.Types.ObjectId;
  questionNumber: number;
  responseTime: number;
  starsAwarded: number;
  points: number;
}

const QuestionLogSchema = new Schema<IQuestionLog>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    questionNumber: { type: Number, required: true },
    responseTime: { type: Number, required: true }, // in seconds
    starsAwarded: { type: Number, required: true },
    points: { type: Number, required: true },
  },
  { timestamps: true }
);

export const QuestionLog: Model<IQuestionLog> =
  mongoose.models.QuestionLog ||
  mongoose.model<IQuestionLog>("QuestionLog", QuestionLogSchema);
