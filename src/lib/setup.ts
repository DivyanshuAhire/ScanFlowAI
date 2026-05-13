import dbConnect from './mongodb';
import { 
  User, 
  Company, 
  Clinic, 
  Employee, 
  Cluster, 
  OfficeTimings, 
  UserRole 
} from '@/models';
import bcrypt from 'bcryptjs';

export async function seedInitialData() {
  await dbConnect();

  console.log('🌱 Seeding initial data...');

  // 1. Create Company
  let company = await Company.findOne({ email: 'contact@scanflow-demo.com' });
  if (!company) {
    company = await Company.create({
      name: 'ScanFlow Diagnostics Ltd',
      address: '123 Tech Park, Mumbai',
      phoneNumber: '+91 9876543210',
      email: 'contact@scanflow-demo.com',
      subscriptionPlan: 'PREMIUM',
      hqLocation: { lat: 19.0760, lng: 72.8777 }
    });
    console.log('✅ Company created');
  }

  // 2. Create Company Admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  let admin = await User.findOne({ email: 'admin@scanflow.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@scanflow.com',
      password: hashedPassword,
      role: UserRole.COMPANY_ADMIN,
      companyId: company._id,
      isVerified: true
    });
    console.log('✅ Admin user created');
  }

  // 3. Create Cluster
  let cluster = await Cluster.findOne({ name: 'Andheri East', companyId: company._id });
  if (!cluster) {
    cluster = await Cluster.create({
      name: 'Andheri East',
      companyId: company._id,
      distanceFromHQ: 12,
      estimatedTravelTimeFromHQ: 36,
      location: { lat: 19.1136, lng: 72.8697 }
    });
    console.log('✅ Cluster created');
  }

  // 4. Create Clinic
  let clinic = await Clinic.findOne({ name: 'City Scan Center', companyId: company._id });
  if (!clinic) {
    clinic = await Clinic.create({
      name: 'City Scan Center',
      companyId: company._id,
      clusterId: cluster._id,
      address: 'Metro Station Road, Andheri',
      location: { lat: 19.1136, lng: 72.8697, area: 'Andheri East' },
      contactPerson: 'Dr. Sharma',
      phoneNumber: '+91 9998887776',
      email: 'cityscan@gmail.com',
      workingHours: { open: '09:00', close: '20:00', holidays: ['Sunday'] }
    });

    // Create Clinic User
    await User.create({
      name: 'City Scan Admin',
      email: 'clinic@scanflow.com',
      password: hashedPassword,
      role: UserRole.CLINIC_USER,
      companyId: company._id,
      clinicId: clinic._id,
      isVerified: true
    });
    console.log('✅ Clinic and Clinic User created');
  }

  // 5. Create Employee
  let employee = await Employee.findOne({ email: 'john@scanflow.com' });
  if (!employee) {
    employee = await Employee.create({
      name: 'John Field Tech',
      email: 'john@scanflow.com',
      phoneNumber: '+91 8887776665',
      companyId: company._id,
      workTimings: { start: '09:00', end: '18:00' }
    });

    // Create Employee User
    await User.create({
      name: 'John Field Tech',
      email: 'employee@scanflow.com',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      companyId: company._id,
      employeeId: employee._id,
      isVerified: true
    });
    console.log('✅ Employee and Employee User created');
  }

  // 6. Create Office Timings
  let timings = await OfficeTimings.findOne({ companyId: company._id });
  if (!timings) {
    await OfficeTimings.create({
      companyId: company._id,
      openingTime: '09:00',
      closingTime: '18:00',
      appointmentInterval: 30,
      travelBuffer: 15
    });
    console.log('✅ Office timings created');
  }

  console.log('✨ Seeding complete!');
  return { company, admin, clinic, employee };
}
