import { Schema, model, models, Document, Model } from 'mongoose';

export interface IOSRMCache extends Document {
  cacheKey: string;
  distanceKm: number;
  pathGeoJSON: any;
  createdAt: Date;
}

const OSRMCacheSchema = new Schema<IOSRMCache>({
  cacheKey:    { type: String, required: true, unique: true, index: true },
  distanceKm:  { type: Number, required: true },
  pathGeoJSON: { type: Schema.Types.Mixed, required: true },
  createdAt:   { type: Date, default: Date.now, expires: 86400 } // Automatic TTL: 24 hours (86400 seconds)
});

export const OSRMCache: Model<IOSRMCache> = models.OSRMCache || model<IOSRMCache>('OSRMCache', OSRMCacheSchema);
