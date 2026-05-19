import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

export interface IAppointment extends Document {
  clinicId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  clusterId?: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  appointmentDate: Date;
  timeSlot: string; // HH:mm
  duration: number; // in minutes
  scanType: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  status: AppointmentStatus;
  notes?: string;
  isOverride: boolean;
  overrideReason?: string;
  isDeleted: boolean;
  routeDirection?: 'OUTWARD' | 'INWARD';
  routeSequencePosition?: number;
  routeDayId?: mongoose.Types.ObjectId;
  travelWeight?: number;
  routeOrder?: number;
  optimizationStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    clusterId: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    appointmentDate: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true },
    duration: { type: Number, default: 30 },
    scanType: { type: String, required: true },
    urgency: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    status: { type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.REQUESTED },
    notes: { type: String },
    isOverride: { type: Boolean, default: false },
    overrideReason: { type: String },
    isDeleted: { type: Boolean, default: false },
    routeDirection: { type: String, enum: ['OUTWARD', 'INWARD'] },
    routeSequencePosition: { type: Number },
    routeDayId: { type: Schema.Types.ObjectId, ref: 'RouteDay' },
    travelWeight: { type: Number, default: 0 },
    routeOrder: { type: Number },
    optimizationStatus: { type: String, default: 'PENDING' },
  },
  { timestamps: true }
);

// Indexes for scheduling engine efficiency
AppointmentSchema.index({ appointmentDate: 1, employeeId: 1 });
AppointmentSchema.index({ companyId: 1, status: 1 });

const Appointment: Model<IAppointment> = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);

export default Appointment;
