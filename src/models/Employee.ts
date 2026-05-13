import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  email?: string;
  phoneNumber: string;
  companyId: mongoose.Types.ObjectId;
  assignedRouteId?: mongoose.Types.ObjectId;
  baseLocation?: {
    lat: number;
    lng: number;
  };
  workTimings: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: false },
    phoneNumber: { type: String, required: true, unique: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    assignedRouteId: { type: Schema.Types.ObjectId, ref: 'Route' },
    baseLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    workTimings: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
    },
    status: { type: String, enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
