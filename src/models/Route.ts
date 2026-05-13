import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoute extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Route: Model<IRoute> = mongoose.models.Route || mongoose.model<IRoute>('Route', RouteSchema);

export default Route;
