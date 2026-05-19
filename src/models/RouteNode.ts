import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRouteNode extends Document {
  route_id: mongoose.Types.ObjectId;
  cluster_id: mongoose.Types.ObjectId;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

const RouteNodeSchema: Schema = new Schema(
  {
    route_id: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    cluster_id: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    level: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const RouteNode: Model<IRouteNode> = mongoose.models.RouteNode || mongoose.model<IRouteNode>('RouteNode', RouteNodeSchema);

export default RouteNode;
