import { Clinic, Cluster, Route } from '@/models';
import mongoose from 'mongoose';

const degreesToRadians = (degrees: number) => {
  return degrees * (Math.PI / 180);
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export class AutoClusterEngine {
  async processNewClinic(clinicId: string, companyId: string) {
    const clinic = await Clinic.findById(clinicId) as any;
    if (!clinic) return;

    const clusters = await Cluster.find({ companyId, isDeleted: false }).lean() as any[];

    let bestCluster: any = null;
    let minDistance = Infinity;

    for (const cluster of clusters) {
      const dist = calculateDistance(clinic.lat, clinic.lng, cluster.center_lat, cluster.center_lng);
      if (dist < minDistance) {
        minDistance = dist;
        bestCluster = cluster;
      }
    }

    if (minDistance < 2 && bestCluster) {
      // Add to cluster
      clinic.cluster_id = bestCluster._id;
      await clinic.save();
      await this.recalculateCentroid(bestCluster._id.toString());
    } else if (minDistance >= 2 && minDistance <= 5 && bestCluster) {
      // Create subcluster
      const newCluster = new Cluster({
        companyId,
        center_lat: clinic.lat,
        center_lng: clinic.lng,
        type: 'SUBCLUSTER',
        parent_cluster: bestCluster._id,
      });
      await newCluster.save();
      clinic.cluster_id = newCluster._id;
      await clinic.save();
    } else {
      // Create new cluster
      const newCluster = new Cluster({
        companyId,
        center_lat: clinic.lat,
        center_lng: clinic.lng,
        type: 'PRIMARY',
      });
      await newCluster.save();
      clinic.cluster_id = newCluster._id;
      
      // Auto route generation root
      const newRoute = new Route({
        companyId,
        root_cluster: newCluster._id
      });
      await newRoute.save();
      
      newCluster.route_id = newRoute._id;
      await newCluster.save();
      
      await clinic.save();
    }
  }

  async recalculateCentroid(clusterId: string) {
    const clinics = await Clinic.find({ cluster_id: clusterId, isDeleted: false });
    if (clinics.length === 0) return;

    let totalLat = 0;
    let totalLng = 0;
    clinics.forEach(c => {
      totalLat += c.lat;
      totalLng += c.lng;
    });

    const center_lat = totalLat / clinics.length;
    const center_lng = totalLng / clinics.length;

    await Cluster.findByIdAndUpdate(clusterId, { center_lat, center_lng });
  }
}

export const autoClusterEngine = new AutoClusterEngine();
