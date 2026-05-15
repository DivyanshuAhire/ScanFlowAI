import { Cluster, Route } from '@/models';

interface GraphEdge {
  to: string;
  weight: number;
}

export class SpatialGraphService {
  private adjacencyList: Map<string, GraphEdge[]> = new Map();

  async buildGraph(companyId: string) {
    this.adjacencyList.clear();

    const clusters = await Cluster.find({ companyId, isDeleted: false }).lean();

    // Group clusters by route
    const routesMap = new Map<string, any[]>();
    for (const cluster of clusters) {
      if (!this.adjacencyList.has(cluster._id.toString())) {
        this.adjacencyList.set(cluster._id.toString(), []);
      }
      for (const routeId of cluster.routeGroupIds) {
        const routeIdStr = routeId.toString();
        if (!routesMap.has(routeIdStr)) {
          routesMap.set(routeIdStr, []);
        }
        routesMap.get(routeIdStr)!.push(cluster);
      }
    }

    // Connect clusters on the same route
    for (const [routeId, routeClusters] of routesMap.entries()) {
      // Sort by distance from HQ
      routeClusters.sort((a, b) => a.distanceFromHQ - b.distanceFromHQ);

      for (let i = 0; i < routeClusters.length - 1; i++) {
        const c1 = routeClusters[i];
        const c2 = routeClusters[i + 1];

        const weight = Math.abs(c2.distanceFromHQ - c1.distanceFromHQ);

        this.addEdge(c1._id.toString(), c2._id.toString(), weight);
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
