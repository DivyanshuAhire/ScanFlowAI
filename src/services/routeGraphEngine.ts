import { Cluster, Company } from '@/models';
import ClusterEdge from '@/models/ClusterEdge';

const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export class RouteGraphEngine {
  async regenerateGraph(companyId: string) {
    const clusters = await Cluster.find({ companyId, isDeleted: false }).lean() as any[];
    
    // Clear existing edges
    await ClusterEdge.deleteMany({
      $or: [
        { from_cluster: { $in: clusters.map(c => c._id) } },
        { from_cluster: companyId }
      ]
    });

    if (clusters.length === 0) return;

    // 1. Fetch Company details to find HQ Location
    const company = await Company.findById(companyId).lean() as any;
    if (!company || !company.hqLocation || !company.hqLocation.lat) {
      console.warn("Company HQ location not found. Cannot generate route graph.");
      return;
    }

    const hqLat = company.hqLocation.lat;
    const hqLng = company.hqLocation.lng;

    // 2. Group clusters by Route corridor
    // A Route is defined by a primary cluster (root_cluster) and its subclusters
    const primaryClusters = clusters.filter(c => c.type === 'PRIMARY');
    
    for (const primary of primaryClusters) {
      // Find all subclusters belonging to this primary cluster
      const subclusters = clusters.filter(c => c.type === 'SUBCLUSTER' && c.parent_cluster?.toString() === primary._id.toString());
      
      // The "last cluster" of this corridor is the one geographically farthest from HQ
      let lastCluster = primary;
      let maxDist = calculateDistance(hqLat, hqLng, primary.center_lat, primary.center_lng);
      
      for (const sub of subclusters) {
        const dist = calculateDistance(hqLat, hqLng, sub.center_lat, sub.center_lng);
        if (dist > maxDist) {
          maxDist = dist;
          lastCluster = sub;
        }
      }

      // Generate a single OSRM driving route from HQ directly to the center of the last cluster
      let finalDistance = maxDist;
      let finalTravelTime = (maxDist / 40) * 60; // 40 km/h avg speed fallback
      let geometry: [number, number][] | undefined = undefined;

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${hqLng},${hqLat};${lastCluster.center_lng},${lastCluster.center_lat}?overview=full&geometries=geojson`;
        console.log(`OSRM routing HQ ➜ Last Cluster (${lastCluster.name || 'End Node'})...`);
        const response = await fetch(osrmUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            finalDistance = route.distance / 1000; // meters to km
            finalTravelTime = route.duration / 60; // seconds to minutes
            if (route.geometry && route.geometry.coordinates) {
              geometry = route.geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
            }
            console.log(`✅ Road route found! HQ ➜ ${lastCluster.name || 'End'}: Dist=${finalDistance.toFixed(2)}km, Time=${finalTravelTime.toFixed(1)}mins`);
          }
        }
      } catch (apiErr) {
        console.warn(`OSRM failed for HQ -> Last Cluster:`, apiErr);
      }

      // Save this single route line as an edge from HQ (companyId) to the lastCluster._id
      try {
        await ClusterEdge.create({
          from_cluster: companyId,
          to_cluster: lastCluster._id,
          distance: finalDistance,
          travel_time: finalTravelTime,
          geometry: geometry
        });
      } catch (err) {
        console.error('Failed to save route edge:', err);
      }
    }
  }
}

export const routeGraphEngine = new RouteGraphEngine();
