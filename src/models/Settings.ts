import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRatingTier {
  name: string;
  maxSeconds: number;
  stars: number;
  points: number;
}

export interface IBadgeThresholds {
  speedThreshold: number;
  finaleQuestionCount: number;
}

export interface ISettingsValue {
  ratingTiers: IRatingTier[];
  mysteryGifts: string[];
  badgeThresholds: IBadgeThresholds;
  allowStudentToStopTimer?: boolean;
  bundleLimit?: number;
  bundleItemName?: string;
  weeklyTargetPoints?: number;
  tieredRewards?: { name: string; points: number }[];
  builderBlockCost?: number;
  customColorCost?: number;
  builderRoofCost?: number;
  builderBlockRefund?: number;
  builderQuote?: string;
  builderItems?: { id: string; name: string; emoji: string; cost: number; refundOnErase: number; width: number; height: number; depth: number }[];
  isClassTime?: boolean;
  landUpgradeCost?: number;
  landUpgradeAmount?: number;
  prefabs?: any[];
}

export interface ISettings extends Document {
  teacherId: mongoose.Types.ObjectId;
  key: string;
  value: ISettingsValue;
}

const SettingsSchema = new Schema<ISettings>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

SettingsSchema.index({ teacherId: 1, key: 1 }, { unique: true });

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
