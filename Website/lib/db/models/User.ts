import { Schema, model, models, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  passwordHash: string;
  role: 'ADMIN' | 'COMPANY_OPERATOR' | 'CLINIC_OPERATOR' | 'EMPLOYEE';
  isActive: boolean;
  name: string;
  clinicId?: Schema.Types.ObjectId;
  employeeId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email:        { type: String, unique: true, sparse: true },
  phone:        { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE'],
    required: true
  },
  isActive:    { type: Boolean, default: true },
  name:        { type: String, required: true },
  clinicId:    { type: Schema.Types.ObjectId, ref: 'Clinic' },   // if CLINIC_OPERATOR
  employeeId:  { type: Schema.Types.ObjectId, ref: 'Employee' }, // if EMPLOYEE
}, { timestamps: true });

export const User: Model<IUser> = models.User || model<IUser>('User', UserSchema);
