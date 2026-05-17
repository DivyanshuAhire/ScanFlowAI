import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClusterEdge extends Document {
  from_cluster: mongoose.Types.ObjectId;
  to_cluster: mongoose.Types.ObjectId;
  distance: number;
  travel_time: number;
  geometry?: [number, number][]; // Array of [lat, lng] coordinates along the roads
  createdAt: Date;
  updatedAt: Date;
}

const ClusterEdgeSchema: Schema = new Schema(
  {
    from_cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    to_cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    distance: { type: Number, required: true },
    travel_time: { type: Number, required: true },
    geometry: { type: [[Number]], default: undefined }
  },
  { timestamps: true }
);

ClusterEdgeSchema.index({ from_cluster: 1, to_cluster: 1 }, { unique: true });

const ClusterEdge: Model<IClusterEdge> = mongoose.models.ClusterEdge || mongoose.model<IClusterEdge>('ClusterEdge', ClusterEdgeSchema);

export default ClusterEdge;
