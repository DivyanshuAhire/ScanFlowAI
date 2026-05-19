const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// User schema definition inline to avoid module loading issues
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: false },
    password: { type: String },
    name: { type: String, required: true },
    role: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database.');

    const email = 'superadmin@scanflow.ai';
    const password = 'admin123';
    
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`⚠️ User with email ${email} already exists.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = new User({
      email,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isVerified: true
    });

    await superAdmin.save();
    console.log('====================================');
    console.log('✅ Super Admin credentials generated!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('====================================');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

seed();
