import mongoose, { Schema, Document, Model } from 'mongoose';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CLINIC_USER = 'CLINIC_USER',
}

export interface IUser extends Document {
  email?: string;
  password?: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  companyId?: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  isVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  refreshToken?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: false },
    password: { type: String },
    name: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    phoneNumber: { type: String, unique: true, index: true, sparse: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    refreshToken: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
