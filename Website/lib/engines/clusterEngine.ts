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
// Returns percentage of coordinates in path1 that are within 250m of any coordinate in path2
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

      // Check if distance is <= 250 meters (handles sparse OSRM nodes and GPS variations)
      if (haversineDistanceMeters(lat1, lng1, lat2, lng2) <= 250) {
        isShared = true;
        break;
      }
    }

    if (isShared) {
      sharedCount++;
    }
  }

  // Use the shorter path as denominator to correctly match subsets/extensions
  const shorterLength = Math.min(coords1.length, coords2.length);
  return (sharedCount / shorterLength) * 100;
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

  if (nearestCluster && minRoadDistance <= 4) {
    // We found a matching cluster within 4km (2km parent radius + 2km perimeter gap)!
    if (minRoadDistance <= 2) {
      // Clinic is contained within the parent cluster radius (<= 2km), assign directly to main cluster
      finalCluster = nearestCluster;
    } else {
      // Clinic is between 2-4km from centroid (1-2km from perimeter), create a SubCluster!
      const subClusterCount = await Cluster.countDocuments({ parentCluster: nearestCluster._id } as any);
      const newSubCluster = await Cluster.create({
        name: `${nearestCluster.name}-Sub${subClusterCount + 1}`,
        centroidLat: lat,
        centroidLng: lng,
        radiusKm: 1, // Subcluster radius is 1km
        parentCluster: nearestCluster._id as any,
        routeIds: nearestCluster.routeIds as any, // Inherits parent's routes
        distanceFromHqKm: clinicDistanceFromHq,
      });
      finalCluster = newSubCluster;
    }
  } else {
    // No cluster within 4km, create a new main Cluster!
    const mainClusterCount = await Cluster.countDocuments({ parentCluster: null } as any);
    const newCluster = await Cluster.create({
      name: `C${mainClusterCount + 1}`,
      centroidLat: lat,
      centroidLng: lng,
      radiusKm: 2, // Main cluster radius is 2km
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
      if (overlapPercent >= 75 && overlapPercent > maxOverlap) {
        maxOverlap = overlapPercent;
        overlappingRoute = route;
      }
    }

    if (overlappingRoute) {
      // Assign to existing route
      assignedRouteId = overlappingRoute._id.toString();

      // Update Route's cluster list
      overlappingRoute.clusterIds.push(targetClusterIdForRoute as any);

      // Dynamic Path Extension: If the new clinic is further along the same path, 
      // extend the route's path to cover the new clinic's full coordinates and distance!
      if (clinicDistanceFromHq > (overlappingRoute.totalDistanceKm || 0)) {
        overlappingRoute.pathGeoJSON = clinicPathFromHq;
        overlappingRoute.totalDistanceKm = clinicDistanceFromHq;
      }

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

  await updateAllRouteClusterIntersections();

  return {
    clusterId: finalCluster._id.toString(),
    routeId: assignedRouteId,
  };
}

export async function updateAllRouteClusterIntersections(): Promise<void> {
  const allRoutes = await Route.find();
  const allClusters = await Cluster.find();

  // Track route-to-cluster and cluster-to-route maps
  const routeToClustersMap = new Map<string, Set<string>>();
  const clusterToRoutesMap = new Map<string, Set<string>>();

  for (const route of allRoutes) {
    routeToClustersMap.set(route._id.toString(), new Set<string>());
  }
  for (const cluster of allClusters) {
    clusterToRoutesMap.set(cluster._id.toString(), new Set<string>());
  }

  for (const route of allRoutes) {
    if (!route.pathGeoJSON?.coordinates || route.pathGeoJSON.coordinates.length === 0) {
      continue;
    }

    const routeCoords = route.pathGeoJSON.coordinates; // Array of [lng, lat]

    for (const cluster of allClusters) {
      const cLat = cluster.centroidLat;
      const cLng = cluster.centroidLng;
      // Standardize search on cluster radius (meters)
      const radiusMeters = (cluster.radiusKm || 2) * 1000;

      let intersects = false;
      for (const coord of routeCoords) {
        const lng = coord[0];
        const lat = coord[1];
        if (haversineDistanceMeters(cLat, cLng, lat, lng) <= radiusMeters) {
          intersects = true;
          break;
        }
      }

      if (intersects) {
        routeToClustersMap.get(route._id.toString())!.add(cluster._id.toString());
        clusterToRoutesMap.get(cluster._id.toString())!.add(route._id.toString());
      }
    }
  }

  // Propagate subclusters to parent clusters and vice versa
  for (const cluster of allClusters) {
    if (cluster.parentCluster) {
      const parentIdStr = cluster.parentCluster.toString();
      const parentRoutes = clusterToRoutesMap.get(parentIdStr);
      const subRoutes = clusterToRoutesMap.get(cluster._id.toString());

      if (parentRoutes && subRoutes) {
        for (const rId of parentRoutes) {
          subRoutes.add(rId);
        }
        for (const rId of subRoutes) {
          parentRoutes.add(rId);
          routeToClustersMap.get(rId)!.add(parentIdStr);
          routeToClustersMap.get(rId)!.add(cluster._id.toString());
        }
      }
    }
  }

  // Update Route database records
  for (const route of allRoutes) {
    const clusterIdStrs = Array.from(routeToClustersMap.get(route._id.toString()) || []);
    
    // Sort clusters by distanceFromHqKm ascending to maintain flow order
    const routeClusters = await Cluster.find({ _id: { $in: clusterIdStrs } } as any);
    routeClusters.sort((a, b) => (a.distanceFromHqKm || 0) - (b.distanceFromHqKm || 0));

    route.clusterIds = routeClusters.map(c => c._id) as any;
    await route.save();
  }

  // Update Cluster database records
  for (const cluster of allClusters) {
    const routeIdStrs = Array.from(clusterToRoutesMap.get(cluster._id.toString()) || []);
    cluster.routeIds = routeIdStrs as any;
    cluster.isSharedHub = routeIdStrs.length > 1;

    if (routeIdStrs.length > 0) {
      const primaryRouteId = routeIdStrs[0];
      const primaryRoute = allRoutes.find(r => r._id.toString() === primaryRouteId);
      if (primaryRoute) {
        const idx = primaryRoute.clusterIds.findIndex(id => id.toString() === cluster._id.toString());
        if (idx !== -1) {
          cluster.routeOrderIndex = idx + 1;
        }
      }
    }
    await cluster.save();
  }
}

export async function regenerateAllClustersAndRoutes(): Promise<void> {
  await connectToDatabase();

  const hq = await CompanyHQ.findOne();
  if (!hq) {
    throw new Error('HQ not set. Cannot regenerate routes.');
  }

  const allClinics = await Clinic.find();
  if (allClinics.length === 0) {
    await Cluster.deleteMany({});
    await Route.deleteMany({});
    return;
  }

  await Cluster.deleteMany({});
  await Route.deleteMany({});

  allClinics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const clinic of allClinics) {
    const { clusterId } = await assignClinicToClusterAndRoute(clinic.name, clinic.lat, clinic.lng);
    clinic.clusterId = clusterId as any;
    await clinic.save();
  }

  await updateAllRouteClusterIntersections();
}
