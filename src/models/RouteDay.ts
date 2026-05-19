import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRouteDay extends Document {
  date: Date;
  routeDirection: 'OUTWARD' | 'INWARD';
  startCluster?: mongoose.Types.ObjectId;
  endCluster?: mongoose.Types.ObjectId;
  totalDistance?: number;
  slotMap: Map<string, string>; // Maps slot (e.g., "09:00", "10:00") to cluster ID
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RouteDaySchema: Schema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    routeDirection: { type: String, enum: ['OUTWARD', 'INWARD'], default: 'OUTWARD' },
    startCluster: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    endCluster: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    totalDistance: { type: Number, default: 0 },
    slotMap: { type: Map, of: String, default: {} },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  },
  { timestamps: true }
);

// Ensure uniqueness per company per date
RouteDaySchema.index({ date: 1, companyId: 1 }, { unique: true });

const RouteDay: Model<IRouteDay> = mongoose.models.RouteDay || mongoose.model<IRouteDay>('RouteDay', RouteDaySchema);

export default RouteDay;
