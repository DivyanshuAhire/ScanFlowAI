import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Clinic } from '@/lib/db/models/Clinic';
import { User } from '@/lib/db/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ clinicId: string }> }) => {
  try {
    await connectToDatabase();
    const { clinicId } = await params;
    const body = await req.json();
    const { enable } = body;

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    if (enable === undefined) {
      return NextResponse.json({ error: 'Missing enable boolean' }, { status: 400 });
    }

    clinic.loginEnabled = enable;
    await clinic.save();

    let generatedCreds = null;

    if (enable) {
      // Check if user already exists
      let user = await User.findOne({ clinicId } as any);
      
      const email = `operator@${clinic.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'clinic'}.com`;
      // Let's generate a temporary password
      const tempPassword = `clinic123${Math.floor(100 + Math.random() * 900)}`;

      if (!user) {
        // Create user
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        user = (await User.create({
          email,
          name: `${clinic.name} Operator`,
          passwordHash,
          role: 'CLINIC_OPERATOR',
          clinicId: clinic._id as any,
          isActive: true
        })) as any;

        generatedCreds = {
          email,
          password: tempPassword
        };
      } else {
        // If user already exists, make sure it is active
        user.isActive = true;
        await user.save();
        
        // Wait, if it exists but we don't know the password, we can generate a new one
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        user.passwordHash = passwordHash;
        await user.save();

        generatedCreds = {
          email: user.email,
          password: tempPassword
        };
      }
    } else {
      // Deactivate user if exists
      const user = await User.findOne({ clinicId } as any);
      if (user) {
        user.isActive = false;
        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      clinic,
      generatedCreds
    });
  } catch (error) {
    console.error('Clinic Login activation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN']);
