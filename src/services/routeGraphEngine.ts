import { Cluster, Company, Route } from '@/models';
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

// Compute overlap percentage: check what % of path1 points (outside the closer cluster's perimeter) are within 150m of any point in path2
function pathOverlapPercentage(
  path1: [number, number][], 
  path2: [number, number][], 
  clusterCentroid?: [number, number], 
  radiusKm?: number
): number {
  if (!path1 || path1.length === 0 || !path2 || path2.length === 0) return 0;
  
  // Filter path1 points to only include those outside the cluster's perimeter/radius
  let pointsToEvaluate = path1;
  if (clusterCentroid && radiusKm) {
    const outsidePoints = path1.filter(pt => {
      const distToCenter = calculateDistance(pt[0], pt[1], clusterCentroid[0], clusterCentroid[1]);
      return distToCenter > radiusKm;
    });
    // Fall back to original path if the filter leaves us with empty array
    if (outsidePoints.length > 0) {
      pointsToEvaluate = outsidePoints;
    }
  }

  let overlappingPoints = 0;
  
  for (const pt1 of pointsToEvaluate) {
    let minDistance = Infinity;
    for (const pt2 of path2) {
      const dist = calculateDistance(pt1[0], pt1[1], pt2[0], pt2[1]);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    
    if (minDistance <= 0.15) { // 150 meters tolerance
      overlappingPoints++;
    }
  }
  
  return (overlappingPoints / pointsToEvaluate.length) * 100;
}

export class RouteGraphEngine {
  async regenerateGraph(companyId: string, forceReset = false) {
    // 1. Fetch Company details to find HQ Location
    const company = await Company.findById(companyId).lean() as any;
    if (!company || !company.hqLocation || !company.hqLocation.lat) {
      console.warn("Company HQ location not found. Cannot generate route graph.");
      return;
    }

    const hqLat = company.hqLocation.lat;
    const hqLng = company.hqLocation.lng;

    // Load all active clusters in the company
    const clusters = await Cluster.find({ companyId, isDeleted: false });
    if (clusters.length === 0) return;

    // Clear existing edges
    await ClusterEdge.deleteMany({
      $or: [
        { from_cluster: { $in: clusters.map(c => c._id) } },
        { from_cluster: companyId }
      ]
    });

    // 2. Emerge a raw OSRM road path for EVERY cluster starting from HQ
    const clustersWithPaths: any[] = [];

    for (const cluster of clusters) {
      let distance = calculateDistance(hqLat, hqLng, cluster.center_lat, cluster.center_lng);
      let travelTime = (distance / 40) * 60; // fallback travel time
      let geometry: [number, number][] = [[hqLat, hqLng], [cluster.center_lat, cluster.center_lng]]; // fallback geometry

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${hqLng},${hqLat};${cluster.center_lng},${cluster.center_lat}?overview=full&geometries=geojson`;
        const response = await fetch(osrmUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            distance = route.distance / 1000;
            travelTime = route.duration / 60;
            if (route.geometry && route.geometry.coordinates) {
              geometry = route.geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
            }
          }
        }
      } catch (err) {
        console.warn(`OSRM path request failed for cluster ${cluster.name}:`, err);
      }

      clustersWithPaths.push({
        cluster,
        distance,
        travelTime,
        geometry
      });
    }

    // 3. Sort clusters by distance from HQ (farthest first)
    clustersWithPaths.sort((a, b) => b.distance - a.distance);

    if (forceReset) {
      // Completely wipe out all existing routes for this company
      await Route.deleteMany({ companyId });
      // Reset all clusters' route_id and routeGroupIds
      await Cluster.updateMany({ companyId }, { $unset: { route_id: "" }, $set: { routeGroupIds: [] } });
    } else {
      // Clean only routes that were marked as deleted
      await Route.deleteMany({ companyId, isDeleted: true });
    }

    // Load all active, existing routes
    const existingRoutes = forceReset ? [] : await Route.find({ companyId, isDeleted: { $ne: true } });

    // Reset all clusters' route_id for this company first
    await Cluster.updateMany({ companyId }, { $unset: { route_id: "" } });

    // 4. Overlap Matching Loop: if a closer cluster tracks >= 80% of a farther cluster's route, merge it!
    const activeRoutes: Array<{ route: any, cluster: any, path: [number, number][], distance: number, travelTime: number, geometry: [number, number][] }> = [];

    // Pre-populate with existing routes to preserve manual edits/endpoints/names
    for (const route of existingRoutes) {
      if (!route.root_cluster) continue;
      
      const item = clustersWithPaths.find(c => c.cluster._id.toString() === route.root_cluster!.toString());
      if (item) {
        // Assign the route ID to the root cluster
        item.cluster.route_id = route._id;
        await item.cluster.save();

        activeRoutes.push({
          route,
          cluster: item.cluster,
          path: item.geometry,
          distance: item.distance,
          travelTime: item.travelTime,
          geometry: item.geometry
        });
      }
    }

    // Now, run the Overlap Matching Loop for clusters that do NOT belong to any active route yet!
    for (const item of clustersWithPaths) {
      // If this cluster is already the root of an active route, skip it
      if (activeRoutes.some(active => active.cluster._id.toString() === item.cluster._id.toString())) {
        continue;
      }

      let merged = false;

      for (const active of activeRoutes) {
        // Check if the farther active path contains at least 90% of this closer item's path (calculated up to cluster perimeter)
        const radiusKm = item.cluster.type === 'PRIMARY' ? 2.0 : 1.0;
        const overlapPct = pathOverlapPercentage(
          item.geometry, 
          active.path, 
          [item.cluster.center_lat, item.cluster.center_lng], 
          radiusKm
        );
        
        if (overlapPct >= 90) {
          item.cluster.route_id = active.route._id;
          await item.cluster.save();
          merged = true;
          console.log(`➜ Emerge Merge: Cluster '${item.cluster.name}' (closer) is 90%+ overlapping with active route to '${active.cluster.name}' (farthest) - absorbed!`);
          break;
        }
      }

      if (!merged) {
        // Create a new independent Route with this cluster as the root/farthest endpoint
        const newRoute = await Route.create({
          companyId,
          root_cluster: item.cluster._id,
          name: `Route via ${item.cluster.name}` // initial default name
        }) as any;

        item.cluster.route_id = newRoute._id;
        await item.cluster.save();

        activeRoutes.push({
          route: newRoute,
          cluster: item.cluster,
          path: item.geometry,
          distance: item.distance,
          travelTime: item.travelTime,
          geometry: item.geometry
        });
        console.log(`➜ Emerge Route Created: Farthest endpoint cluster '${item.cluster.name}' established.`);
      }
    }

    // 5. Sequence and save only unique farther route lines as ClusterEdges (closer ones erased)
    for (const active of activeRoutes) {
      // Find all clusters in this route and sort by distance ascending (nearest to farthest sequence)
      const routeClusters = await Cluster.find({ route_id: active.route._id, isDeleted: false });
      routeClusters.sort((a, b) => {
        const itemA = clustersWithPaths.find(c => c.cluster._id.toString() === a._id.toString());
        const itemB = clustersWithPaths.find(c => c.cluster._id.toString() === b._id.toString());
        return (itemA?.distance || 0) - (itemB?.distance || 0);
      });

      for (let seq = 0; seq < routeClusters.length; seq++) {
        const c = routeClusters[seq];
        const cItem = clustersWithPaths.find(ci => ci.cluster._id.toString() === c._id.toString());
        c.sequenceIndex = seq + 1;
        c.cumulativeDistanceFromHQ = cItem?.distance || 0;
        await c.save();
      }

      // Create a single driving line from HQ (companyId) to the farthest cluster (active.cluster._id)
      try {
        await ClusterEdge.create({
          from_cluster: companyId,
          to_cluster: active.cluster._id,
          distance: active.distance,
          travel_time: active.travelTime,
          geometry: active.geometry
        });
        console.log(`➜ Rendered Unified Route Line: HQ ➜ '${active.cluster.name}'`);
      } catch (err) {
        console.error('Failed to save route edge:', err);
      }
    }
  }
}

export const routeGraphEngine = new RouteGraphEngine();
