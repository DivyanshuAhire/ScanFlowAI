import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoute extends Document {
  root_cluster?: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema: Schema = new Schema(
  {
    root_cluster: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (mongoose.models.Route) {
  delete mongoose.models.Route;
}

const Route: Model<IRoute> = mongoose.model<IRoute>('Route', RouteSchema);

export default Route;
