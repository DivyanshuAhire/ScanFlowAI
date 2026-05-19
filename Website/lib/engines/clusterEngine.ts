import { connectToDatabase } from '@/lib/db/mongoose';
import { CompanyHQ } from '../db/models/CompanyHQ';
import { Cluster, ICluster } from '../db/models/Cluster';
import { Route, IRoute } from '../db/models/Route';
import { Clinic } from '../db/models/Clinic';
import { getRoadRoute } from '../osrm/client';

const ROUTE_COLORS = [
  '#E63946', // Red
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Teal
  '#FF5722', // Deep Orange
  '#607D8B', // Blue Grey
  '#8BC34A', // Light Green
  '#F06292', // Pink
];

// Helper: Haversine distance in meters between two coordinates
export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper: Calculate overlap between new clinic's path and existing route path
// Returns percentage of coordinates in path1 that are within 50m of any coordinate in path2
export function calculateRouteOverlap(path1: any, path2: any): number {
  if (!path1?.coordinates || !path2?.coordinates || path1.coordinates.length === 0 || path2.coordinates.length === 0) {
    return 0;
  }

  const coords1 = path1.coordinates; // Array of [lng, lat]
  const coords2 = path2.coordinates;

  let sharedCount = 0;

  for (const coord1 of coords1) {
    const lng1 = coord1[0];
    const lat1 = coord1[1];
    let isShared = false;

    for (const coord2 of coords2) {
      const lng2 = coord2[0];
      const lat2 = coord2[1];

      // Check if distance is <= 50 meters
      if (haversineDistanceMeters(lat1, lng1, lat2, lng2) <= 50) {
        isShared = true;
        break;
      }
    }

    if (isShared) {
      sharedCount++;
    }
  }

  return (sharedCount / coords1.length) * 100;
}

export async function assignClinicToClusterAndRoute(
  clinicName: string,
  lat: number,
  lng: number
): Promise<{ clusterId: string; routeId: string }> {
  await connectToDatabase();

  // 1. Get HQ
  const hq = await CompanyHQ.findOne();
  if (!hq) {
    throw new Error('HQ coordinates not set. Admin must set HQ on map first.');
  }

  // Step A: Calculate road distance & path from HQ to new clinic
  const hqRouteResult = await getRoadRoute({ lat: hq.lat, lng: hq.lng }, { lat, lng });
  const clinicDistanceFromHq = hqRouteResult.distanceKm;
  const clinicPathFromHq = hqRouteResult.pathGeoJSON;

  // Step B: Cluster Assignment
  const allClusters = await Cluster.find({ parentCluster: null }); // Get main clusters only
  let nearestCluster: ICluster | null = null;
  let minRoadDistance = Infinity;

  for (const cluster of allClusters) {
    try {
      const roadResult = await getRoadRoute(
        { lat: cluster.centroidLat, lng: cluster.centroidLng },
        { lat, lng }
      );
      if (roadResult.distanceKm < minRoadDistance) {
        minRoadDistance = roadResult.distanceKm;
        nearestCluster = cluster;
      }
    } catch (err) {
      console.error(`Error calculating distance to cluster ${cluster.name}:`, err);
    }
  }

  let finalCluster: ICluster;

  if (nearestCluster && minRoadDistance <= 5) {
    // We found a matching cluster within 5km!
    if (minRoadDistance <= 2) {
      // Clinic is close to centroid, assign directly to this main cluster
      finalCluster = nearestCluster;
    } else {
      // Clinic is between 2-5km from centroid, create a SubCluster
      const subClusterCount = await Cluster.countDocuments({ parentCluster: nearestCluster._id } as any);
      const newSubCluster = await Cluster.create({
        name: `${nearestCluster.name}-Sub${subClusterCount + 1}`,
        centroidLat: lat,
        centroidLng: lng,
        radiusKm: 2,
        parentCluster: nearestCluster._id as any,
        routeIds: nearestCluster.routeIds as any, // Inherits parent's routes
        distanceFromHqKm: clinicDistanceFromHq,
      });
      finalCluster = newSubCluster;
    }
  } else {
    // No cluster within 5km, create a new main Cluster!
    const mainClusterCount = await Cluster.countDocuments({ parentCluster: null } as any);
    const newCluster = await Cluster.create({
      name: `C${mainClusterCount + 1}`,
      centroidLat: lat,
      centroidLng: lng,
      radiusKm: 5,
      parentCluster: null,
      routeIds: [],
      distanceFromHqKm: clinicDistanceFromHq,
    });
    finalCluster = newCluster;
  }

  // Step C: Route Assignment (only for main clusters, subclusters inherit)
  const targetClusterIdForRoute = finalCluster.parentCluster || finalCluster._id;
  const clusterToUpdate = finalCluster.parentCluster
    ? await Cluster.findById(finalCluster.parentCluster)
    : finalCluster;

  if (!clusterToUpdate) {
    throw new Error('Cluster resolution failed');
  }

  let assignedRouteId: string;

  // If the cluster already has routes assigned, we just use the first one
  if (clusterToUpdate.routeIds && clusterToUpdate.routeIds.length > 0) {
    assignedRouteId = clusterToUpdate.routeIds[0].toString();
  } else {
    // Route overlap check
    const allRoutes = await Route.find();
    let overlappingRoute: IRoute | null = null;
    let maxOverlap = 0;

    for (const route of allRoutes) {
      const overlapPercent = calculateRouteOverlap(clinicPathFromHq, route.pathGeoJSON);
      if (overlapPercent >= 90 && overlapPercent > maxOverlap) {
        maxOverlap = overlapPercent;
        overlappingRoute = route;
      }
    }

    if (overlappingRoute) {
      // Assign to existing route
      assignedRouteId = overlappingRoute._id.toString();
      
      // Update Route's cluster list
      overlappingRoute.clusterIds.push(targetClusterIdForRoute as any);
      
      // Sort Route clusters by distanceFromHqKm ascending
      const routeClusters = await Cluster.find({ _id: { $in: overlappingRoute.clusterIds } } as any);
      routeClusters.sort((a, b) => (a.distanceFromHqKm || 0) - (b.distanceFromHqKm || 0));
      overlappingRoute.clusterIds = routeClusters.map(c => c._id) as any;
      await overlappingRoute.save();

      // Update Cluster route tracking
      if (!clusterToUpdate.routeIds.includes(overlappingRoute._id as any)) {
        clusterToUpdate.routeIds.push(overlappingRoute._id as any);
      }
      
      // If shared by multiple routes, set shared hub flag
      if (clusterToUpdate.routeIds.length > 1) {
        clusterToUpdate.isSharedHub = true;
      }
      
      // Update order index
      clusterToUpdate.routeOrderIndex = routeClusters.findIndex(c => c._id.toString() === targetClusterIdForRoute.toString()) + 1;
      await clusterToUpdate.save();

      // If we created a subcluster, make sure it inherits the route information
      if (finalCluster.parentCluster) {
        finalCluster.routeIds = clusterToUpdate.routeIds;
        await finalCluster.save();
      }
    } else {
      // Create a new Route!
      const routeCount = await Route.countDocuments();
      const color = ROUTE_COLORS[routeCount % ROUTE_COLORS.length];
      
      const newRoute = (await Route.create({
        name: `Route ${routeCount + 1}`,
        color,
        pathGeoJSON: clinicPathFromHq,
        totalDistanceKm: clinicDistanceFromHq,
        clusterIds: [targetClusterIdForRoute as any],
      })) as any;

      assignedRouteId = newRoute._id.toString();

      // Update cluster route details
      clusterToUpdate.routeIds = [newRoute._id] as any;
      clusterToUpdate.routeOrderIndex = 1; // First node on this route
      await clusterToUpdate.save();

      // If we created a subcluster, make sure it inherits
      if (finalCluster.parentCluster) {
        finalCluster.routeIds = [newRoute._id] as any;
        await finalCluster.save();
      }
    }
  }

  return {
    clusterId: finalCluster._id.toString(),
    routeId: assignedRouteId,
  };
}

export async function regenerateAllClustersAndRoutes(): Promise<void> {
  await connectToDatabase();

  const hq = await CompanyHQ.findOne();
  if (!hq) {
    throw new Error('HQ not set. Cannot regenerate routes.');
  }

  const allClinics = await Clinic.find();
  if (allClinics.length === 0) {
    // If no clinics, clear clusters and routes
    await Cluster.deleteMany({});
    await Route.deleteMany({});
    return;
  }

  // Reset all clusters and routes
  await Cluster.deleteMany({});
  await Route.deleteMany({});

  // Sort clinics by creation date or ID to maintain some determinism
  allClinics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Re-run clinic assignment for every single clinic
  for (const clinic of allClinics) {
    const { clusterId } = await assignClinicToClusterAndRoute(clinic.name, clinic.lat, clinic.lng);
    clinic.clusterId = clusterId as any;
    await clinic.save();
  }
}
