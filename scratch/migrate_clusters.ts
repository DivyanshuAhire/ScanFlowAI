import dbConnect from './src/lib/mongodb';
import { Cluster } from './src/models';

async function migrate() {
  await dbConnect();
  console.log('Starting migration...');
  
  const clusters = await Cluster.find({});
  for (const cluster of clusters) {
    // If it has the old singular field, migrate it
    const raw: any = cluster.toObject();
    if (raw.routeGroupId && (!raw.routeGroupIds || raw.routeGroupIds.length === 0)) {
      console.log(`Migrating cluster ${cluster.name}...`);
      await Cluster.updateOne(
        { _id: cluster._id },
        { 
          $set: { routeGroupIds: [raw.routeGroupId] },
          $unset: { routeGroupId: 1 } 
        }
      );
    }
  }
  console.log('Migration complete.');
  process.exit(0);
}

migrate();
