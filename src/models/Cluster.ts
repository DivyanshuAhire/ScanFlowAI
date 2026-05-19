import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICluster extends Document {
  name: string;
  center_lat: number;
  center_lng: number;
  latitude?: number;
  longitude?: number;
  sequenceIndex: number;
  cumulativeDistanceFromHQ: number;
  routePosition: number;
  parent_cluster?: mongoose.Types.ObjectId;
  type: string; // PRIMARY, SUBCLUSTER, SHARED
  route_id?: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClusterSchema: Schema = new Schema(
  {
    name: { type: String, default: 'Auto Cluster' },
    center_lat: { type: Number, required: true },
    center_lng: { type: Number, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    sequenceIndex: { type: Number, default: 0 },
    cumulativeDistanceFromHQ: { type: Number, default: 0 },
    routePosition: { type: Number, default: 0 },
    parent_cluster: { type: Schema.Types.ObjectId, ref: 'Cluster' },
    type: { type: String, enum: ['PRIMARY', 'SUBCLUSTER', 'SHARED'], default: 'PRIMARY' },
    route_id: { type: Schema.Types.ObjectId, ref: 'Route' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate name before save if not modified specifically and sync lat/lng
ClusterSchema.pre('save', function(this: any) {
  if (this.isNew && this.name === 'Auto Cluster') {
    this.name = `Cluster ${this._id.toString().substring(18).toUpperCase()}`;
  }
  
  if (!this.latitude && this.center_lat) this.latitude = this.center_lat;
  if (!this.longitude && this.center_lng) this.longitude = this.center_lng;
  if (!this.center_lat && this.latitude) this.center_lat = this.latitude;
  if (!this.center_lng && this.longitude) this.center_lng = this.longitude;
});

if (mongoose.models.Cluster) {
  delete mongoose.models.Cluster;
}

const Cluster: Model<ICluster> = mongoose.model<ICluster>('Cluster', ClusterSchema);

export default Cluster;
