import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWithdrawalLog extends Document {
  studentId: mongoose.Types.ObjectId;
  pointsDeducted: number;
  rewardDescription: string;
  date: Date;
}

const WithdrawalLogSchema = new Schema<IWithdrawalLog>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    pointsDeducted: { type: Number, required: true },
    rewardDescription: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const WithdrawalLog: Model<IWithdrawalLog> =
  mongoose.models.WithdrawalLog || mongoose.model<IWithdrawalLog>("WithdrawalLog", WithdrawalLogSchema);
