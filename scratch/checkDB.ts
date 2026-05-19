
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Minimal Schemas
const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', new mongoose.Schema({}, { strict: false }));
const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));
const Employee = mongoose.models.Employee || mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', new mongoose.Schema({
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    appointmentDate: Date,
    timeSlot: String,
    status: String,
    isDeleted: Boolean,
    companyId: mongoose.Schema.Types.ObjectId
}, { strict: false }));

async function checkDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected.');

    const clusterCount = await Cluster.countDocuments({ isDeleted: false });
    const clinicCount = await Clinic.countDocuments({ isDeleted: false });
    const employeeCount = await Employee.countDocuments({ isDeleted: false });
    
    console.log('\n--- Database Stats ---');
    console.log(`Total Clusters: ${clusterCount}`);
    console.log(`Total Clinics: ${clinicCount}`);
    console.log(`Total Employees: ${employeeCount}`);

    console.log('\n--- Employees ---');
    const employees = await Employee.find({ isDeleted: false }).limit(5);
    employees.forEach(e => {
        console.log(`- ${e.name} (${e.status}) ID: ${e._id}`);
    });

    console.log('\n--- Detailed Appointment Audit ---');
    const auditApps = await Appointment.find({ isDeleted: false })
        .sort({ appointmentDate: -1, timeSlot: 1 })
        .populate('clinicId')
        .limit(10);

    for (const app of auditApps) {
        const clinic = app.clinicId as any;
        const cluster = await Cluster.findById(clinic?.clusterId);
        console.log(`[${app.appointmentDate?.toISOString().split('T')[0]} ${app.timeSlot}]`);
        console.log(`  Clinic: ${clinic?.name} | Cluster: ${cluster?.name} (${clinic?.clusterId})`);
        console.log(`  Assigned Tech: ${app.employeeId || 'NONE'}`);
        console.log('  -----------------------------------');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
