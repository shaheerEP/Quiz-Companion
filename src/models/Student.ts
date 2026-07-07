import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
  teacherId: mongoose.Types.ObjectId;
  name: string;
  password?: string;
  totalSessions: number;
  lifetimePoints: number;
  pointsBalance: number;
  pet?: {
    type: string;
    name: string;
    level: number;
    equippedHat?: string;
    equippedEnvironment?: string;
  };
  inventory: string[];
  customColors: string[];
  unlockedAvatars: string[];
  activeAvatar: string;
  isClassTime?: boolean;
  rewardSystem?: 'classic' | 'tiered';
  profileImageUrl?: string;
  weeklyPoints?: number;
  lastWeeklyReset?: Date;
  dailyPoints?: number;
  lastDailyReset?: Date;
  assignedGame?: 'pet' | 'builder';
  landSize: number;
  worldBlocks: Array<{
    x: number;
    y: number;
    z: number;
    color: string;
    type?: 'block' | 'item' | 'roof' | 'large-roof';
    itemId?: string;
    rotationY?: number;
    thickness?: number;
    depth?: number;
    w?: number;
    d?: number;
    h?: number;
    width?: number;
    curveness?: number;
    blockShape?: 'box' | 'wedge' | 'pyramid';
    materialType?: string;
    textureId?: string;
  }>;
  mannersEnabled?: boolean;
}

const StudentSchema = new Schema<IStudent>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    name: { type: String, required: true },
    password: { type: String, required: false },
    totalSessions: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    pointsBalance: { type: Number, default: 0 },
    pet: {
      type: {
        type: String, // e.g. 'dragon', 'robot', 'alien'
      },
      name: String,
      level: { type: Number, default: 1 },
      equippedHat: String,
      equippedEnvironment: String,
    },
    inventory: { type: [String], default: [] },
    customColors: { type: [String], default: [] },
    unlockedAvatars: { type: [String], default: ['boy'] },
    activeAvatar: { type: String, default: 'boy' },
    isClassTime: { type: Boolean, default: false },
    rewardSystem: { type: String, enum: ['classic', 'tiered'], default: 'classic' },
    profileImageUrl: { type: String },
    weeklyPoints: { type: Number, default: 0 },
    lastWeeklyReset: { type: Date },
    dailyPoints: { type: Number, default: 0 },
    lastDailyReset: { type: Date },
    assignedGame: { type: String, enum: ['pet', 'builder'], default: 'pet' },
    landSize: { type: Number, default: 50 },
    worldBlocks: {
      type: [
        {
          x: Number,
          y: Number,
          z: Number,
          color: String,
          type: { type: String, default: 'block' },
          itemId: String,
          rotationY: { type: Number, default: 0 },
          thickness: { type: Number, default: 1 },
          depth: { type: Number, default: 1 },
          w: Number,
          d: Number,
          h: Number,
          width: Number,
          curveness: Number,
          blockShape: String,
          materialType: String,
          textureId: String
        }
      ],
      default: []
    },
    mannersEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

StudentSchema.index({ teacherId: 1, name: 1 }, { unique: true });

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);
