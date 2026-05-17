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
        { from_cluster: companyId } // Clear HQ edge
      ]
    });

    if (clusters.length === 0) return;

    // 1. Fetch Company details to find HQ Location
    const company = await Company.findById(companyId).lean() as any;
    if (company && company.hqLocation && company.hqLocation.lat) {
      // Find the closest cluster to the HQ
      let closestCluster: any = null;
      let minHqDist = Infinity;
      for (const c of clusters) {
        const dist = calculateDistance(company.hqLocation.lat, company.hqLocation.lng, c.center_lat, c.center_lng);
        if (dist < minHqDist) {
          minHqDist = dist;
          closestCluster = c;
        }
      }

      if (closestCluster) {
        let finalDistance = minHqDist;
        let finalTravelTime = (minHqDist / 40) * 60;
        let geometry: [number, number][] | undefined = undefined;

        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${company.hqLocation.lng},${company.hqLocation.lat};${closestCluster.center_lng},${closestCluster.center_lat}?overview=full&geometries=geojson`;
          const response = await fetch(osrmUrl);
          if (response.ok) {
            const result = await response.json();
            if (result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              finalDistance = route.distance / 1000;
              finalTravelTime = route.duration / 60;
              if (route.geometry && route.geometry.coordinates) {
                geometry = route.geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
              }
            }
          }
        } catch (apiErr) {
          console.warn(`OSRM failed for HQ -> nearest cluster:`, apiErr);
        }

        try {
          await ClusterEdge.create({
            from_cluster: companyId,
            to_cluster: closestCluster._id,
            distance: finalDistance,
            travel_time: finalTravelTime,
            geometry: geometry
          });
          console.log(`🏠 HQ Route Connected to nearest cluster ${closestCluster.name}`);
        } catch (err) {
          console.error('Failed to save HQ edge:', err);
        }
      }
    }

    // 2. Generate cluster-to-cluster mesh network
    for (let i = 0; i < clusters.length; i++) {
      const c1 = clusters[i];
      
      let distances = [];
      for (let j = 0; j < clusters.length; j++) {
        if (i === j) continue;
        const c2 = clusters[j];
        const dist = calculateDistance(c1.center_lat, c1.center_lng, c2.center_lat, c2.center_lng);
        distances.push({ clusterId: c2._id, clusterLat: c2.center_lat, clusterLng: c2.center_lng, distance: dist });
      }

      distances.sort((a, b) => a.distance - b.distance);
      
      // Connect to nearest 2 clusters
      const nearest = distances.slice(0, 2);
      
      for (const n of nearest) {
        let finalDistance = n.distance;
        let finalTravelTime = (n.distance / 40) * 60; // 40 km/h avg speed
        let geometry: [number, number][] | undefined = undefined;

        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${c1.center_lng},${c1.center_lat};${n.clusterLng},${n.clusterLat}?overview=full&geometries=geojson`;
          const response = await fetch(osrmUrl);
          if (response.ok) {
            const result = await response.json();
            if (result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              finalDistance = route.distance / 1000;
              finalTravelTime = route.duration / 60;
              
              if (route.geometry && route.geometry.coordinates) {
                geometry = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
              }
            }
          }
        } catch (apiErr) {
          console.warn(`OSRM Routing API failed, using straight line fallback:`, apiErr);
        }

        const edgeId1 = c1._id.toString();
        const edgeId2 = n.clusterId.toString();
        const from_cluster = edgeId1 < edgeId2 ? edgeId1 : edgeId2;
        const to_cluster = edgeId1 < edgeId2 ? edgeId2 : edgeId1;

        try {
          await ClusterEdge.updateOne(
            { from_cluster, to_cluster },
            { 
              $set: { 
                distance: finalDistance, 
                travel_time: finalTravelTime,
                geometry: geometry
              } 
            },
            { upsert: true }
          );
        } catch (e) {
          // ignore dup key
        }
      }
    }
  }
}

export const routeGraphEngine = new RouteGraphEngine();
