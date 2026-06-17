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
  builderBlockCost?: number;
  customColorCost?: number;
  builderRoofCost?: number;
  builderBlockRefund?: number;
  builderQuote?: string;
  builderItems?: { id: string; name: string; emoji: string; cost: number; refundOnErase: number; width: number; height: number; depth: number }[];
}

export interface ISettings extends Document {
  key: string;
  value: ISettingsValue;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
