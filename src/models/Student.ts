import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
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
  assignedGame?: 'pet' | 'builder';
  worldBlocks: Array<{
    x: number;
    y: number;
    z: number;
    color: string;
    type?: 'block' | 'item' | 'roof' | 'large-roof';
    itemId?: string;
    rotationY?: number;
    w?: number;
    d?: number;
    h?: number;
  }>;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, unique: true },
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
    assignedGame: { type: String, enum: ['pet', 'builder'], default: 'pet' },
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
          w: Number,
          d: Number,
          h: Number,
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);
