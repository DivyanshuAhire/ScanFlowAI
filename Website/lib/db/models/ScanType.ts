import { Schema, model, models, Document, Model } from 'mongoose';

export interface IScanType extends Document {
  name: string;
  durationMins: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScanTypeSchema = new Schema<IScanType>({
  name:         { type: String, required: true, unique: true },
  durationMins: { type: Number, required: true, default: 35 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

export const ScanType: Model<IScanType> = models.ScanType || model<IScanType>('ScanType', ScanTypeSchema);
