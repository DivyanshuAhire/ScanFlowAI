import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOfficeTimings extends Document {
  companyId: mongoose.Types.ObjectId;
  openingTime: string; // HH:mm
  closingTime: string; // HH:mm
  appointmentInterval: number; // in minutes
  travelBuffer: number; // in minutes
  holidays: string[]; // ['Sunday']
  blackoutTimings: {
    start: string;
    end: string;
    reason: string;
  }[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OfficeTimingsSchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    openingTime: { type: String, default: '09:00' },
    closingTime: { type: String, default: '18:00' },
    appointmentInterval: { type: Number, default: 30 },
    travelBuffer: { type: Number, default: 15 },
    holidays: [{ type: String }],
    blackoutTimings: [
      {
        start: { type: String },
        end: { type: String },
        reason: { type: String },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OfficeTimings: Model<IOfficeTimings> = mongoose.models.OfficeTimings || mongoose.model<IOfficeTimings>('OfficeTimings', OfficeTimingsSchema);

export default OfficeTimings;
