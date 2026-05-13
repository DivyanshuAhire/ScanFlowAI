import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  logo?: string;
  address: string;
  phoneNumber: string;
  email: string;
  subscriptionPlan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  hqLocation?: {
    lat: number;
    lng: number;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    logo: { type: String },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    subscriptionPlan: { type: String, enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'], default: 'BASIC' },
    subscriptionStatus: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
    hqLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company;
