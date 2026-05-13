import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICluster extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  routeGroupIds: mongoose.Types.ObjectId[];
  distanceFromHQ: number; // in KM
  estimatedTravelTimeFromHQ: number; // in minutes
  location?: {
    lat: number;
    lng: number;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClusterSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    routeGroupIds: [{ type: Schema.Types.ObjectId, ref: 'Route' }],
    distanceFromHQ: { type: Number, default: 0 },
    estimatedTravelTimeFromHQ: { type: Number, default: 0 },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Handle model compilation error in Next.js hot-reloading
if (mongoose.models.Cluster) {
  delete mongoose.models.Cluster;
}

const Cluster: Model<ICluster> = mongoose.model<ICluster>('Cluster', ClusterSchema);

export default Cluster;
