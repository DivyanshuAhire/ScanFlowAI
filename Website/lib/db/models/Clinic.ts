import { Schema, model, models, Document, Model } from 'mongoose';

export interface IClinic extends Document {
  name: string;
  phone: string;
  lat: number;
  lng: number;
  clusterId: Schema.Types.ObjectId;
  loginEnabled: boolean;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSchema = new Schema<IClinic>({
  name:         { type: String, required: true },
  phone:        { type: String, required: true },
  lat:          { type: Number, required: true },
  lng:          { type: Number, required: true },
  clusterId:    { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
  loginEnabled: { type: Boolean, default: false },
  address:      { type: String },
}, { timestamps: true });

export const Clinic: Model<IClinic> = models.Clinic || model<IClinic>('Clinic', ClinicSchema);
