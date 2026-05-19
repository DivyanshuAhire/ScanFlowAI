const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function migrate() {
  try {
    // 1. Read env variables
    const envPath = path.join(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
      throw new Error('.env.local file not found at ' + envPath);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^MONGODB_URI=(.*)$/m);
    if (!match || !match[1]) {
      throw new Error('MONGODB_URI not defined in .env.local');
    }
    const mongoUri = match[1].trim();

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    // 2. Define standard Cluster Schema for Migration
    const ClusterSchema = new mongoose.Schema({
      name: String,
      center_lat: Number,
      center_lng: Number,
      latitude: Number,
      longitude: Number,
      sequenceIndex: Number,
      cumulativeDistanceFromHQ: Number,
      routePosition: Number,
      route_id: mongoose.Schema.Types.ObjectId,
      companyId: mongoose.Schema.Types.ObjectId,
      isDeleted: { type: Boolean, default: false }
    }, { collection: 'clusters' });

    const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', ClusterSchema);

    // 3. Find active clusters
    const allClusters = await Cluster.find({ isDeleted: { $ne: true } });
    console.log(`📋 Found ${allClusters.length} active clusters to process.`);

    // Group by route_id
    const routeGroups = {};
    const unroutedClusters = [];

    for (const cluster of allClusters) {
      if (cluster.route_id) {
        const rId = cluster.route_id.toString();
        if (!routeGroups[rId]) routeGroups[rId] = [];
        routeGroups[rId].push(cluster);
      } else {
        unroutedClusters.push(cluster);
      }
    }

    let migratedCount = 0;

    // 4. Sequence Routed Clusters
    for (const [routeId, clusters] of Object.entries(routeGroups)) {
      console.log(`\nRoute ID: ${routeId} (${clusters.length} clusters)`);
      // Sort alphabetically by name to build a stable sequence
      clusters.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      for (let index = 0; index < clusters.length; index++) {
        const cluster = clusters[index];
        const sequenceIndex = index + 1;
        const cumulativeDistance = sequenceIndex * 5; // Simulates 5km increments per hop
        const routePosition = index;

        console.log(`  Updating ${cluster.name || 'Unnamed Cluster'} -> Seq: ${sequenceIndex}, Distance: ${cumulativeDistance}km, Pos: ${routePosition}`);

        await Cluster.updateOne(
          { _id: cluster._id },
          {
            $set: {
              sequenceIndex,
              cumulativeDistanceFromHQ: cumulativeDistance,
              routePosition,
              latitude: cluster.center_lat,
              longitude: cluster.center_lng
            }
          }
        );
        migratedCount++;
      }
    }

    // 5. Sequence Unrouted Clusters
    if (unroutedClusters.length > 0) {
      console.log(`\nProcessing ${unroutedClusters.length} unrouted clusters...`);
      for (let index = 0; index < unroutedClusters.length; index++) {
        const cluster = unroutedClusters[index];
        const sequenceIndex = index + 1;
        const cumulativeDistance = sequenceIndex * 5;
        const routePosition = index;

        console.log(`  Updating unrouted ${cluster.name || 'Unnamed'} -> Seq: ${sequenceIndex}, Distance: ${cumulativeDistance}km, Pos: ${routePosition}`);

        await Cluster.updateOne(
          { _id: cluster._id },
          {
            $set: {
              sequenceIndex,
              cumulativeDistanceFromHQ: cumulativeDistance,
              routePosition,
              latitude: cluster.center_lat,
              longitude: cluster.center_lng
            }
          }
        );
        migratedCount++;
      }
    }

    console.log(`\n✅ Migration successfully completed! Total clusters migrated: ${migratedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
