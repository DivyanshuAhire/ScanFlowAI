import mongoose from 'mongoose';
import dbConnect from './src/lib/mongodb';

async function dropIndex() {
  await dbConnect();
  console.log('Connecting to drop index...');
  try {
    const collection = mongoose.connection.collection('employees');
    await collection.dropIndex('email_1');
    console.log('Successfully dropped email_1 index.');
  } catch (err: any) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index email_1 not found, nothing to drop.');
    } else {
      console.error('Error dropping index:', err.message);
    }
  }
  process.exit(0);
}

dropIndex();
