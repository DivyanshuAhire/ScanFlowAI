import { connectToDatabase } from '@/lib/db/mongoose';
import { OSRMCache } from '@/lib/db/models/OSRMCache';

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'http://router.project-osrm.org';

interface OSRMResult {
  distanceKm: number;
  pathGeoJSON: any;
}

// In-memory cache for fast access
const memoryCache = new Map<string, OSRMResult>();

export async function getRoadRoute(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): Promise<OSRMResult> {
  const cacheKey = `osrm:${from.lat.toFixed(6)}:${from.lng.toFixed(6)}:${to.lat.toFixed(6)}:${to.lng.toFixed(6)}`;

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check MongoDB cache
  try {
    await connectToDatabase();
    const cachedRecord = await OSRMCache.findOne({ cacheKey });
    if (cachedRecord) {
      const result = {
        distanceKm: cachedRecord.distanceKm,
        pathGeoJSON: cachedRecord.pathGeoJSON
      };
      // Populate memory cache for future calls
      memoryCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error('Error checking OSRM MongoDB cache:', error);
  }

  // 3. Query OSRM public demo API
  const url = `${OSRM_BASE_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found by OSRM');
    }

    const route = data.routes[0];
    const distanceMeters = route.distance;
    const distanceKm = distanceMeters / 1000;
    const pathGeoJSON = route.geometry; // LineString

    const result = {
      distanceKm,
      pathGeoJSON
    };

    // 4. Save to in-memory cache
    memoryCache.set(cacheKey, result);

    // 5. Save to MongoDB cache (async, don't block response)
    OSRMCache.create({
      cacheKey,
      distanceKm,
      pathGeoJSON
    }).catch(err => console.error('Error saving to OSRMCache in DB:', err));

    return result;
  } catch (error) {
    console.error(`Failed to fetch road route from OSRM: ${url}`, error);
    
    // Fallback: Straight-line distance calculation (Haversine formula) in case OSRM is down
    const R = 6371; // Earth radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    
    // Straight line path as fallback
    const pathGeoJSON = {
      type: 'LineString',
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat]
      ]
    };

    return { distanceKm, pathGeoJSON };
  }
}

export async function getRoadDistance(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): Promise<number> {
  const route = await getRoadRoute(from, to);
  return route.distanceKm;
}
