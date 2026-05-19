import { Schema, model, models, Document, Model } from 'mongoose';

export interface IAppointment extends Document {
  clinicId: Schema.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:MM" 24hr
  durationMins: number;
  scanTypeId: Schema.Types.ObjectId;
  status: 'PENDING' | 'CONFIRMED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
  suggestedByEmployeeId?: Schema.Types.ObjectId | null;
  assignedEmployeeId?: Schema.Types.ObjectId | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  clinicId:               { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
  date:                   { type: String, required: true }, // "YYYY-MM-DD"
  slotTime:               { type: String, required: true }, // "HH:MM" 24hr
  durationMins:           { type: Number, required: true },
  scanTypeId:             { type: Schema.Types.ObjectId, ref: 'ScanType', required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  suggestedByEmployeeId:  { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  assignedEmployeeId:     { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  notes:                  { type: String },
}, { timestamps: true });

// Compound index to prevent double-booking same clinic at same slot
AppointmentSchema.index({ clinicId: 1, date: 1, slotTime: 1 }, { unique: true });
// Index on date and status for daily queries
AppointmentSchema.index({ date: 1, status: 1 });

export const Appointment: Model<IAppointment> = models.Appointment || model<IAppointment>('Appointment', AppointmentSchema);
