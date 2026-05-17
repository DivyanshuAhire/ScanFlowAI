import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClinic extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  cluster_id?: mongoose.Types.ObjectId;
  route_id?: mongoose.Types.ObjectId;
  address: string;
  lat: number;
  lng: number;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  workingHours: {
    open: string;
    close: string;
    holidays: string[];
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    cluster_id: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    route_id: { type: Schema.Types.ObjectId, ref: 'Route' },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    contactPerson: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    workingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      holidays: [{ type: String }],
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (mongoose.models.Clinic) {
  delete mongoose.models.Clinic;
}
const Clinic: Model<IClinic> = mongoose.model<IClinic>('Clinic', ClinicSchema);
export default Clinic;
