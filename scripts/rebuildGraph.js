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

  // 1. Connect Company HQ to closest cluster
  if (company && company.hqLocation && company.hqLocation.lat && clusters.length > 0) {
    let closestCluster = null;
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
      let geometry = undefined;

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${company.hqLocation.lng},${company.hqLocation.lat};${closestCluster.center_lng},${closestCluster.center_lat}?overview=full&geometries=geojson`;
        console.log(`Fetching road route: HQ -> ${closestCluster.name}...`);
        const response = await fetch(osrmUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            finalDistance = route.distance / 1000;
            finalTravelTime = route.duration / 60;
            if (route.geometry && route.geometry.coordinates) {
              geometry = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
            }
            console.log(`✅ HQ Connected! Dist=${finalDistance.toFixed(2)}km, Time=${finalTravelTime.toFixed(1)}mins, Pts=${geometry ? geometry.length : 0}`);
          }
        }
      } catch (apiErr) {
        console.warn(`❌ HQ OSRM failed:`, apiErr);
      }

      try {
        await mongoose.connection.db.collection('clusteredges').insertOne({
          from_cluster: new mongoose.Types.ObjectId(companyId),
          to_cluster: closestCluster._id,
          distance: finalDistance,
          travel_time: finalTravelTime,
          geometry: geometry,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Saved HQ Edge to DB.`);
      } catch (err) {
        console.error('Failed to save HQ edge:', err);
      }
    }
  }

  // 2. Connect cluster-to-cluster mesh
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
      let finalTravelTime = (n.distance / 40) * 60;
      let geometry = undefined;

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${c1.center_lng},${c1.center_lat};${n.clusterLng},${n.clusterLat}?overview=full&geometries=geojson`;
        console.log(`Fetching road route: ${c1.name} -> Neighbor...`);
        const response = await fetch(osrmUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            finalDistance = route.distance / 1000;
            finalTravelTime = route.duration / 60;
            
            if (route.geometry && route.geometry.coordinates) {
              geometry = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
            }
            console.log(`✅ Road route found! Dist=${finalDistance.toFixed(2)}km, Time=${finalTravelTime.toFixed(1)}mins, Pts=${geometry ? geometry.length : 0}`);
          }
        }
      } catch (apiErr) {
        console.warn(`❌ OSRM failed:`, apiErr);
      }

      const edgeId1 = c1._id.toString();
      const edgeId2 = n.clusterId.toString();
      const from_cluster = edgeId1 < edgeId2 ? new mongoose.Types.ObjectId(edgeId1) : new mongoose.Types.ObjectId(edgeId2);
      const to_cluster = edgeId1 < edgeId2 ? new mongoose.Types.ObjectId(edgeId2) : new mongoose.Types.ObjectId(edgeId1);

      try {
        await mongoose.connection.db.collection('clusteredges').updateOne(
          { from_cluster, to_cluster },
          { 
            $set: { 
              distance: finalDistance, 
              travel_time: finalTravelTime,
              geometry: geometry,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
        console.log(`Saved Edge to DB.`);
      } catch (e) {
        console.error('Error saving edge:', e);
      }
    }
  }

  console.log('Graph rebuilt successfully.');
  await mongoose.connection.close();
}

rebuild();
