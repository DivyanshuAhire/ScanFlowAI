import { Schema, model, models, Document, Model } from 'mongoose';

export interface ICluster extends Document {
  name: string;
  centroidLat: number;
  centroidLng: number;
  radiusKm: number;
  parentCluster: Schema.Types.ObjectId | null;
  routeIds: Schema.Types.ObjectId[];
  isSharedHub: boolean;
  distanceFromHqKm?: number;
  routeOrderIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClusterSchema = new Schema<ICluster>({
  name:           { type: String, required: true },
  centroidLat:    { type: Number, required: true },
  centroidLng:    { type: Number, required: true },
  radiusKm:       { type: Number, default: 5 },
  parentCluster:  { type: Schema.Types.ObjectId, ref: 'Cluster', default: null },
  routeIds:       [{ type: Schema.Types.ObjectId, ref: 'Route' }], // can belong to multiple if shared hub
  isSharedHub:    { type: Boolean, default: false },
  distanceFromHqKm: { type: Number }, // road distance, pre-computed
  routeOrderIndex:  { type: Number }, // position in route (1 = closest to HQ)
}, { timestamps: true });

export const Cluster: Model<ICluster> = models.Cluster || model<ICluster>('Cluster', ClusterSchema);
