/**
 * CLINIC SEEDING SCRIPT
 * 
 * This script populates the database with test clinics for every existing cluster.
 * Each cluster will receive 2 clinics following the naming convention: ClusterName_Clinic_1/2.
 * 
 * HOW TO RUN:
 * 1. Ensure your .env.local file has MONGODB_URI defined.
 * 2. Run the following command in your terminal:
 *    npx tsx scripts/seedClinics.ts
 * 
 * Note: 'tsx' is a modern TypeScript executor that handles ES modules and env files well.
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Minimal Model Definitions (to avoid dependency issues with the main app structure)
const ClusterSchema = new mongoose.Schema({
  name: String,
  companyId: mongoose.Schema.Types.ObjectId,
  isDeleted: { type: Boolean, default: false }
});

const ClinicSchema = new mongoose.Schema({
  name: String,
  companyId: mongoose.Schema.Types.ObjectId,
  clusterId: mongoose.Schema.Types.ObjectId,
  address: String,
  location: {
    lat: Number,
    lng: Number,
    area: String
  },
  contactPerson: String,
  phoneNumber: String,
  email: String,
  workingHours: {
    open: String,
    close: String,
    holidays: [String]
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', ClusterSchema);
const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', ClinicSchema);

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected successfully.');

    const clusters = await Cluster.find({ isDeleted: false });
    
    if (clusters.length === 0) {
      console.log('⚠️ No clusters found to seed clinics for.');
      process.exit(0);
    }

    console.log(`🌱 Seeding clinics for ${clusters.length} clusters...`);
    let createdCount = 0;

    for (const cluster of clusters) {
      const clinicsToCreate = [
        {
          name: `${cluster.name}_Clinic_1`,
          companyId: cluster.companyId,
          clusterId: cluster._id,
          address: `${cluster.name} Main Road, Block A`,
          location: {
            lat: 19.0760,
            lng: 72.8777,
            area: cluster.name
          },
          contactPerson: 'Admin One',
          phoneNumber: '9876543210',
          email: `clinic1@${cluster.name.toLowerCase().replace(/\s+/g, '')}.com`,
          workingHours: {
            open: '09:00',
            close: '18:00',
            holidays: ['Sunday']
          }
        },
        {
          name: `${cluster.name}_Clinic_2`,
          companyId: cluster.companyId,
          clusterId: cluster._id,
          address: `${cluster.name} South Avenue, Sector 4`,
          location: {
            lat: 19.0760,
            lng: 72.8777,
            area: cluster.name
          },
          contactPerson: 'Admin Two',
          phoneNumber: '9876543211',
          email: `clinic2@${cluster.name.toLowerCase().replace(/\s+/g, '')}.com`,
          workingHours: {
            open: '10:00',
            close: '19:00',
            holidays: ['Sunday']
          }
        }
      ];

      for (const clinicData of clinicsToCreate) {
        await Clinic.findOneAndUpdate(
          { name: clinicData.name, clusterId: clinicData.clusterId },
          clinicData,
          { upsert: true, new: true }
        );
        createdCount++;
      }
    }

    console.log(`✅ Successfully seeded ${createdCount} clinics.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
