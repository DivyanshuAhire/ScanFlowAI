const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('--- COMPANIES ---');
  const companies = await mongoose.connection.db.collection('companies').find().toArray();
  companies.forEach(c => console.log(`Company: ${c.name} (${c._id}) HQ:`, c.hqLocation));

  console.log('\n--- CLINICS ---');
  const clinics = await mongoose.connection.db.collection('clinics').find().toArray();
  clinics.forEach(c => console.log(`Clinic: ${c.name} | Lat: ${c.lat}, Lng: ${c.lng} | Cluster: ${c.cluster_id}`));

  console.log('\n--- CLUSTERS ---');
  const clusters = await mongoose.connection.db.collection('clusters').find().toArray();
  clusters.forEach(c => console.log(`Cluster: ${c.name} | Lat: ${c.center_lat}, Lng: ${c.center_lng} | Type: ${c.type} | Parent: ${c.parent_cluster}`));

  console.log('\n--- EDGES ---');
  const edges = await mongoose.connection.db.collection('clusteredges').find().toArray();
  edges.forEach(e => console.log(`Edge: ${e.from_cluster} -> ${e.to_cluster} | Dist: ${e.distance} | Geometry Points:`, e.geometry ? e.geometry.length : 0));

  await mongoose.connection.close();
}

check();
