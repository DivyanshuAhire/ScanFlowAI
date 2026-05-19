import mongoose from 'mongoose';
import { Cluster, Route } from '@/models';
import ClusterDistanceMatrix from '@/models/ClusterDistanceMatrix';

interface GraphEdge {
  to: string;
  weight: number;
}

export class SpatialGraphService {
  private adjacencyList: Map<string, GraphEdge[]> = new Map();

  async buildGraph(companyId: string) {
    this.adjacencyList.clear();

    const [clusters, manualDistances] = await Promise.all([
      Cluster.find({ companyId, isDeleted: false }).lean(),
      ClusterDistanceMatrix.find({ companyId, isDeleted: false }).lean()
    ]);

    // Initialize adjacency list
    for (const cluster of clusters) {
      this.adjacencyList.set(cluster._id.toString(), []);
    }

    // 1. Add Manual Distances (Highest Priority)
    for (const md of manualDistances as any[]) {
      this.addEdge(md.fromClusterId.toString(), md.toClusterId.toString(), md.distance);
    }

    // 2. Add Route-based Connections (Tree-based)
    for (const cluster of clusters as any[]) {
      if (cluster.route_id && cluster.parent_cluster) {
        const c1Id = cluster._id.toString();
        const c2Id = cluster.parent_cluster.toString();

        // Check if a manual edge already exists
        const existing = this.adjacencyList.get(c1Id)?.find(e => e.to === c2Id);
        if (!existing) {
          const parentClusterObj = clusters.find(cl => cl._id.toString() === c2Id);
          const weight = parentClusterObj 
            ? Math.abs((cluster.cumulativeDistanceFromHQ || 0) - (parentClusterObj.cumulativeDistanceFromHQ || 0)) 
            : 1;
          this.addEdge(c1Id, c2Id, weight);
        }
      }
    }
  }

  private addEdge(from: string, to: string, weight: number) {
    const edgesFrom = this.adjacencyList.get(from) || [];
    // Only add if not already present or update if shorter
    const existing = edgesFrom.find(e => e.to === to);
    if (!existing) {
      edgesFrom.push({ to, weight });
    } else if (weight < existing.weight) {
      existing.weight = weight;
    }
    this.adjacencyList.set(from, edgesFrom);

    // Undirected graph
    const edgesTo = this.adjacencyList.get(to) || [];
    const existingTo = edgesTo.find(e => e.to === from);
    if (!existingTo) {
      edgesTo.push({ to: from, weight });
    } else if (weight < existingTo.weight) {
      existingTo.weight = weight;
    }
    this.adjacencyList.set(to, edgesTo);
  }

  // Dijkstra's algorithm for shortest path
  calculateDistance(startClusterId: string, endClusterId: string): number {
    if (startClusterId === endClusterId) return 0;
    
    // Fallback if graph not fully connected or node missing
    if (!this.adjacencyList.has(startClusterId) || !this.adjacencyList.has(endClusterId)) {
        return 999; // Represents infinity/unreachable for this logic
    }

    const distances = new Map<string, number>();
    const unvisited = new Set<string>();

    for (const node of this.adjacencyList.keys()) {
      distances.set(node, Infinity);
      unvisited.add(node);
    }

    distances.set(startClusterId, 0);

    while (unvisited.size > 0) {
      let currentNode = null;
      let minDistance = Infinity;

      for (const node of unvisited) {
        if (distances.get(node)! < minDistance) {
          currentNode = node;
          minDistance = distances.get(node)!;
        }
      }

      if (!currentNode || minDistance === Infinity) break;
      if (currentNode === endClusterId) return minDistance;

      unvisited.delete(currentNode);

      const neighbors = this.adjacencyList.get(currentNode) || [];
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.to)) continue;

        const newDist = minDistance + neighbor.weight;
        if (newDist < distances.get(neighbor.to)!) {
          distances.set(neighbor.to, newDist);
        }
      }
    }

    return distances.get(endClusterId) === Infinity ? 999 : distances.get(endClusterId)!;
  }

  calculateTravelTime(distanceKm: number): number {
    return distanceKm * 3;
  }
}

export const spatialGraphService = new SpatialGraphService();
