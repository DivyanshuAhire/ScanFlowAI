import dbConnect from './src/lib/mongodb';
import { Appointment } from './src/models';

async function check() {
  await dbConnect();
  const apps = await Appointment.find({}).populate('employeeId', 'name');
  console.log('Total Appointments:', apps.length);
  apps.forEach(a => {
    console.log(`ID: ${a._id}, Employee: ${a.employeeId?.name || 'Unassigned'}, Date: ${a.appointmentDate}`);
  });
  process.exit(0);
}

check();
