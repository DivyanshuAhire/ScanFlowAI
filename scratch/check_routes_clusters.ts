import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not defined in .env.local');
  process.exit(1);
}

// Schemas
const Route = mongoose.models.Route || mongoose.model('Route', new mongoose.Schema({}, { strict: false }));
const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', new mongoose.Schema({}, { strict: false }));

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected.\n');

    // Fetch all active routes
    const routes = await Route.find({ isDeleted: { $ne: true } }).lean();
    // Fetch all active clusters
    const clusters = await Cluster.find({ isDeleted: { $ne: true } }).lean();

    console.log(`=== Database Report ===`);
    console.log(`Total active Routes: ${routes.length}`);
    console.log(`Total active Clusters: ${clusters.length}`);
    console.log(`=======================\n`);

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      // Find all clusters assigned to this route
      const routeClusters = clusters.filter(c => c.route_id?.toString() === route._id.toString());
      
      // Sort by sequenceIndex
      routeClusters.sort((a, b) => (a.sequenceIndex || 0) - (b.sequenceIndex || 0));

      const rootCluster = clusters.find(c => c._id.toString() === route.root_cluster?.toString());

      console.log(`Route #${i + 1}`);
      console.log(`  Route ID: ${route._id}`);
      console.log(`  Farthest Endpoint: ${rootCluster ? `${rootCluster.name} (Dist: ${rootCluster.cumulativeDistanceFromHQ?.toFixed(2)} km)` : 'Unknown'}`);
      console.log(`  Number of clusters: ${routeClusters.length}`);
      console.log(`  Clusters on this route (in progressive order from HQ):`);
      
      if (routeClusters.length === 0) {
        console.log(`    (No clusters assigned yet)`);
      } else {
        routeClusters.forEach(c => {
          console.log(`    - [Seq ${c.sequenceIndex}] Cluster Name: ${c.name || 'Unnamed Cluster'} | Type: ${c.type} | Distance: ${c.cumulativeDistanceFromHQ?.toFixed(2) || '0.00'} km | Center: [${c.center_lat}, ${c.center_lng}]`);
        });
      }
      console.log('--------------------------------------------------\n');
    }

    // List unrouted clusters
    const unrouted = clusters.filter(c => !c.route_id);
    if (unrouted.length > 0) {
      console.log(`Unrouted Clusters:`);
      unrouted.forEach(c => {
        console.log(`  - Cluster: ${c.name || 'Unnamed'} | Distance: ${c.cumulativeDistanceFromHQ?.toFixed(2) || '0.00'} km | Center: [${c.center_lat}, ${c.center_lng}]`);
      });
      console.log('--------------------------------------------------\n');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
