import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOverride extends Document {
  companyId: mongoose.Types.ObjectId;
  appointmentId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  reason: string;
  previousSnapshot: any;
  createdAt: Date;
}

const OverrideSchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    previousSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Override: Model<IOverride> = mongoose.models.Override || mongoose.model<IOverride>('Override', OverrideSchema);

export default Override;
