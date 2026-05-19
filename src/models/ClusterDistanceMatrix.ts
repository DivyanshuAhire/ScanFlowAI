import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClusterDistanceMatrix extends Document {
  companyId: mongoose.Types.ObjectId;
  fromClusterId: mongoose.Types.ObjectId;
  toClusterId: mongoose.Types.ObjectId;
  distance: number; // in KM
  travelTime: number; // in minutes
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClusterDistanceMatrixSchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    fromClusterId: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    toClusterId: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    distance: { type: Number, required: true },
    travelTime: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for quick distance lookup
ClusterDistanceMatrixSchema.index({ fromClusterId: 1, toClusterId: 1 }, { unique: true });

const ClusterDistanceMatrix: Model<IClusterDistanceMatrix> = mongoose.models.ClusterDistanceMatrix || mongoose.model<IClusterDistanceMatrix>('ClusterDistanceMatrix', ClusterDistanceMatrixSchema);

export default ClusterDistanceMatrix;
