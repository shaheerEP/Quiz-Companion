import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomProductBlock {
  x: number;
  y: number;
  z: number;
  color: string;
  type?: 'block' | 'item' | 'roof' | 'large-roof';
  itemId?: string;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  thickness?: number;
  depth?: number;
  w?: number;
  d?: number;
  h?: number;
  width?: number;
  curveness?: number;
  blockShape?: 'box' | 'wedge' | 'pyramid' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'dome';
  materialType?: string;
  textureId?: string;
}

export interface ICustomProduct {
  id: string;
  name: string;
  emoji: string;
  cost?: number;
  refundOnErase?: number;
  width?: number;
  height?: number;
  depth?: number;
  blocks: ICustomProductBlock[];
  createdAt?: Date;
}

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
    blockShape?: 'box' | 'wedge' | 'pyramid' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'dome';
    materialType?: string;
    textureId?: string;
  }>;
  customProducts?: ICustomProduct[];
  mannersEnabled?: boolean;
  mannersList?: { task: string; maxStars: number; id: string }[];
  revisionEnabled?: boolean;
  revisionRewindDays?: number[];
  tasks?: ITaskItem[];
  notesText?: string;
  notes?: INoteItem[];
}

export interface INoteItem {
  id: string;
  text: string;
  isCheckbox: boolean;
  checked: boolean;
  createdAt?: Date;
}

export interface ITaskItem {
  id: string;
  title: string;
  points: number;
  isRepeatable: boolean;
  completed: boolean;
  completedCount?: number;
  lastCompletedAt?: Date;
  createdAt?: Date;
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
    customProducts: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          emoji: { type: String, default: "📦" },
          cost: { type: Number, default: 0 },
          refundOnErase: { type: Number, default: 0 },
          width: { type: Number, default: 1 },
          height: { type: Number, default: 1 },
          depth: { type: Number, default: 1 },
          blocks: { type: Array, default: [] },
          createdAt: { type: Date, default: Date.now },
        }
      ],
      default: []
    },
    mannersEnabled: { type: Boolean, default: false },
    mannersList: { type: [{ task: String, maxStars: Number, id: String }], default: [] },
    revisionEnabled: { type: Boolean, default: false },
    revisionRewindDays: { type: [Number], default: [1, 2, 7, 14, 30, 90] },
    tasks: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          points: { type: Number, required: true, default: 10 },
          isRepeatable: { type: Boolean, default: false },
          completed: { type: Boolean, default: false },
          completedCount: { type: Number, default: 0 },
          lastCompletedAt: { type: Date },
          createdAt: { type: Date, default: Date.now },
        }
      ],
      default: []
    },
    notesText: { type: String, default: "" },
    notes: {
      type: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          isCheckbox: { type: Boolean, default: false },
          checked: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        }
      ],
      default: []
    },
  },
  { timestamps: true }
);

StudentSchema.index({ teacherId: 1, name: 1 }, { unique: true });

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);
