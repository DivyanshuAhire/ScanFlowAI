const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = "mongodb://pblmgroup110_db_user:iCr82qzuKzR2L0Sv@ac-teiruk8-shard-00-00.is2ag24.mongodb.net:27017,ac-teiruk8-shard-00-01.is2ag24.mongodb.net:27017,ac-teiruk8-shard-00-02.is2ag24.mongodb.net:27017/ScanFlow?ssl=true&replicaSet=atlas-ak3n3k-shard-0&authSource=admin&appName=ScanFlow";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const UserSchema = new mongoose.Schema({
    email: String,
    phone: String,
    passwordHash: String,
    role: String,
    isActive: Boolean
  }, { strict: false });

  const User = mongoose.model('User', UserSchema);

  const users = await User.find();
  console.log("Total users found:", users.length);
  for (const u of users) {
    console.log(`- ID: ${u._id}, Email: ${u.email || 'N/A'}, Phone: ${u.phone || 'N/A'}, Role: ${u.role}, Active: ${u.isActive}`);
  }

  // Check if admin@scanflow.com exists. If it does, let's reset its password to admin123scanflow to be 100% sure!
  const admin = await User.findOne({ email: 'admin@scanflow.com' });
  if (admin) {
    console.log("Found admin@scanflow.com. Resetting password...");
    const hash = await bcrypt.hash('admin123scanflow', 12);
    admin.passwordHash = hash;
    admin.isActive = true;
    await admin.save();
    console.log("Password reset completed successfully!");
  } else {
    console.log("admin@scanflow.com NOT found. Creating one...");
    const hash = await bcrypt.hash('admin123scanflow', 12);
    await User.create({
      email: 'admin@scanflow.com',
      name: 'System Admin',
      passwordHash: hash,
      role: 'ADMIN',
      isActive: true
    });
    console.log("Admin user seeded successfully!");
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
