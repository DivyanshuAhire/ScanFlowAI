import { Schema, model, models, Document, Model } from 'mongoose';

export interface IAssignment extends Document {
  employeeId: Schema.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  routeId?: Schema.Types.ObjectId;
  appointmentIds: Schema.Types.ObjectId[];
  isConfirmed: boolean;
  idleGapWarning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
  employeeId:   { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:         { type: String, required: true }, // "YYYY-MM-DD"
  routeId:      { type: Schema.Types.ObjectId, ref: 'Route' },
  appointmentIds: [{ type: Schema.Types.ObjectId, ref: 'Appointment' }], // ordered
  isConfirmed:  { type: Boolean, default: false },
  idleGapWarning: { type: Boolean, default: false }, // flagged if gap > 3hrs
}, { timestamps: true });

export const Assignment: Model<IAssignment> = models.Assignment || model<IAssignment>('Assignment', AssignmentSchema);
