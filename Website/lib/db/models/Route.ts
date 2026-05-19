import { Schema, model, models, Document, Model } from 'mongoose';

export interface IRoute extends Document {
  name: string;
  color: string;
  pathGeoJSON?: any;
  totalDistanceKm?: number;
  clusterIds: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema<IRoute>({
  name:           { type: String, required: true },
  color:          { type: String, required: true }, // hex e.g. "#E63946"
  pathGeoJSON:    { type: Schema.Types.Mixed },     // GeoJSON LineString from HQ to furthest cluster
  totalDistanceKm:{ type: Number },
  clusterIds:     [{ type: Schema.Types.ObjectId, ref: 'Cluster' }], // ordered by routeOrderIndex
}, { timestamps: true });

export const Route: Model<IRoute> = models.Route || model<IRoute>('Route', RouteSchema);
