import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClinic extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  clusterId?: mongoose.Types.ObjectId;
  routeId?: mongoose.Types.ObjectId;
  address: string;
  location: {
    lat: number;
    lng: number;
    area: string;
  };
  contactPerson: string;
  phoneNumber: string;
  email: string;
  workingHours: {
    open: string; // HH:mm
    close: string; // HH:mm
    holidays: string[]; // ['Monday', 'Sunday']
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    clusterId: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route' },
    address: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      area: { type: String, required: true },
    },
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

const Clinic: Model<IClinic> = mongoose.models.Clinic || mongoose.model<IClinic>('Clinic', ClinicSchema);

export default Clinic;
