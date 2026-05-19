import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { ScanType } from './models/ScanType';

export async function seedDatabase() {
  try {
    // 1. Seed Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@scanflow.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123scanflow';

    const existingAdmin = await User.findOne({ role: 'ADMIN' });

    if (!existingAdmin) {
      console.log('No Admin user found. Seeding admin...');
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        email: adminEmail,
        name: 'System Admin',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      });
      console.log('Admin user seeded successfully!');
    }

    // 2. Seed Default Scan Types
    const defaultScanTypes = [
      { name: 'DentalScan', durationMins: 35, isActive: true },
      { name: 'OrthoScan', durationMins: 45, isActive: true },
      { name: 'CBCT Scan', durationMins: 60, isActive: true },
    ];

    for (const scanType of defaultScanTypes) {
      const existing = await ScanType.findOne({ name: scanType.name });
      if (!existing) {
        await ScanType.create(scanType);
        console.log(`Seeded ScanType: ${scanType.name}`);
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
