const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

async function rebuild() {
  await mongoose.connect(MONGODB_URI);
  
  const companyId = '6a0a1c3f07e503dbc35b7251'; // Bhakti Dental Lab
  
  console.log(`Rebuilding graph for company: ${companyId}...`);
  
  const clusters = await mongoose.connection.db.collection('clusters').find({ companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false }).toArray();
  const company = await mongoose.connection.db.collection('companies').findOne({ _id: new mongoose.Types.ObjectId(companyId) });

  console.log(`Found ${clusters.length} clusters.`);

  // Clear existing edges
  await mongoose.connection.db.collection('clusteredges').deleteMany({
    $or: [
      { from_cluster: { $in: clusters.map(c => c._id) } },
      { from_cluster: new mongoose.Types.ObjectId(companyId) }
    ]
  });

  if (clusters.length === 0) {
    console.log('No clusters found to route.');
    await mongoose.connection.close();
    return;
  }

  if (!company || !company.hqLocation || !company.hqLocation.lat) {
    console.log('No company HQ location found.');
    await mongoose.connection.close();
    return;
  }

  const hqLat = company.hqLocation.lat;
  const hqLng = company.hqLocation.lng;

  // 1. Group clusters by Route corridor
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
    let geometry = undefined;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${hqLng},${hqLat};${lastCluster.center_lng},${lastCluster.center_lat}?overview=full&geometries=geojson`;
      console.log(`Fetching road route: HQ -> Last Cluster (${lastCluster.name || 'End Node'})...`);
      const response = await fetch(osrmUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          finalDistance = route.distance / 1000; // meters to km
          finalTravelTime = route.duration / 60; // seconds to minutes
          if (route.geometry && route.geometry.coordinates) {
            geometry = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
          }
          console.log(`✅ HQ ➜ Last Cluster Connected! Dist=${finalDistance.toFixed(2)}km, Time=${finalTravelTime.toFixed(1)}mins, Pts=${geometry ? geometry.length : 0}`);
        }
      }
    } catch (apiErr) {
      console.warn(`❌ HQ -> Last Cluster OSRM failed:`, apiErr);
    }

    try {
      await mongoose.connection.db.collection('clusteredges').insertOne({
        from_cluster: new mongoose.Types.ObjectId(companyId),
        to_cluster: lastCluster._id,
        distance: finalDistance,
        travel_time: finalTravelTime,
        geometry: geometry,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Saved Route Edge from HQ to ${lastCluster.name || 'End Cluster'} in DB.`);
    } catch (err) {
      console.error('Failed to save route edge:', err);
    }
  }

  console.log('Graph rebuilt successfully.');
  await mongoose.connection.close();
}

rebuild();
