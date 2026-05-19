import { Schema, model, models, Document, Model } from 'mongoose';

export interface ICompanyHQ extends Document {
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyHQSchema = new Schema<ICompanyHQ>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { timestamps: true });

export const CompanyHQ: Model<ICompanyHQ> = models.CompanyHQ || model<ICompanyHQ>('CompanyHQ', CompanyHQSchema);
