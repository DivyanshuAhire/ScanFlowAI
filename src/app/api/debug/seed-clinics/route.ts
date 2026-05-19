import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Cluster, Clinic } from '@/models';

export async function GET() {
  try {
    await dbConnect();

    // Find all clusters
    const clusters = await Cluster.find({ isDeleted: false });

    if (clusters.length === 0) {
      return NextResponse.json({ message: 'No clusters found to seed clinics for.' });
    }

    let createdCount = 0;

    for (const cluster of clusters) {
      // Check if clinics already exist for this cluster to avoid duplicates if needed
      // But user asked to fill, so I'll just add them.

      const clinicsToCreate = [
        {
          name: `${cluster.name}_Clinic_1`,
          companyId: cluster.companyId,
          clusterId: cluster._id,
          address: `${cluster.name} Main Road, Block A`,
          location: {
            lat: 19.0760, // Dummy coordinates
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
        // Upsert by name and clusterId to be safe
        await Clinic.findOneAndUpdate(
          { name: clinicData.name, clusterId: clinicData.clusterId },
          clinicData,
          { upsert: true, new: true }
        );
        createdCount++;
      }
    }

    return NextResponse.json({
      message: `Successfully seeded ${createdCount} clinics across ${clusters.length} clusters.`,
      clustersProcessed: clusters.length,
      totalClinicsCreated: createdCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
