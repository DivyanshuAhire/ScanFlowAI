import { Schema, model, models, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  userId: Schema.Types.ObjectId;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
  userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  isActive:{ type: Boolean, default: true },
}, { timestamps: true });

export const Employee: Model<IEmployee> = models.Employee || model<IEmployee>('Employee', EmployeeSchema);
