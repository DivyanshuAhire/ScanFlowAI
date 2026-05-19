import dbConnect from './mongodb';
import { 
  User, 
  UserRole 
} from '@/models';
import bcrypt from 'bcryptjs';

export async function seedInitialData() {
  await dbConnect();

  console.log('🌱 Initializing Clean System...');

  // 1. Create Master Super Admin
  const superHashedPassword = await bcrypt.hash('super123', 10);
  
  let superAdmin = await User.findOne({ email: 'superadmin@scanflow.com' });
  if (!superAdmin) {
    superAdmin = await User.create({
      name: 'Global Super Admin',
      email: 'superadmin@scanflow.com',
      password: superHashedPassword,
      role: UserRole.SUPER_ADMIN,
      isVerified: true
    });
    console.log('👑 Master Super Admin created successfully');
  } else {
    console.log('ℹ️ Super Admin already exists');
  }

  console.log('✨ System Initialization Complete!');
  return { superAdmin };
}
