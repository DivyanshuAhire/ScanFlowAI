const path = require('path');
// Set up tsconfig-paths or alias resolution so imports work flawlessly
require('ts-node').register({
  project: path.join(__dirname, '../tsconfig.json')
});

const dbConnect = require('../src/lib/mongodb').default;
const { Cluster } = require('../src/models');

async function migrate() {
  try {
    await dbConnect();
    console.log('🔄 Starting Cluster Route Progression Migration...');
    
    const allClusters = await Cluster.find({ isDeleted: false });
    console.log(`📋 Found ${allClusters.length} active clusters to process.`);

    // Group clusters by route_id
    const routeGroups: { [key: string]: any[] } = {};
    const unroutedClusters: any[] = [];

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

    // 1. Process Routed Clusters
    for (const [routeId, clusters] of Object.entries(routeGroups)) {
      console.log(`\nRoute: ${routeId} has ${clusters.length} clusters.`);
      // Sort clusters by their name or creation date to establish a stable sequence
      clusters.sort((a, b) => a.name.localeCompare(b.name));

      for (let index = 0; index < clusters.length; index++) {
        const cluster = clusters[index];
        const sequenceIndex = index + 1;
        const cumulativeDistance = sequenceIndex * 5; // Simulates 5km increments per hop
        const routePosition = index;

        console.log(`  Updating ${cluster.name} -> Seq: ${sequenceIndex}, Distance: ${cumulativeDistance}km, Pos: ${routePosition}`);

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

    // 2. Process Unrouted Clusters (Fallback sequencing)
    if (unroutedClusters.length > 0) {
      console.log(`\nProcessing ${unroutedClusters.length} unrouted clusters...`);
      for (let index = 0; index < unroutedClusters.length; index++) {
        const cluster = unroutedClusters[index];
        const sequenceIndex = index + 1;
        const cumulativeDistance = sequenceIndex * 5;
        const routePosition = index;

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
