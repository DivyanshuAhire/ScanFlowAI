import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Employee } from '@/models';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const employees = await Employee.find({ companyId, isDeleted: false })
      .populate('assignedRouteId', 'name')
      .sort({ name: 1 });

    // Clean up legacy unique email indexes if they exist
    try {
      const db = mongoose.connection.db;
      if (db) {
        // Fix for Employees collection
        const empIndexes = await db.collection('employees').indexes();
        if (empIndexes.some(idx => idx.name === 'email_1')) {
          await db.collection('employees').dropIndex('email_1');
          console.log('Dropped legacy employees email index');
        }

        // Fix for Users collection
        const userIndexes = await db.collection('users').indexes();
        if (userIndexes.some(idx => idx.name === 'email_1')) {
          await db.collection('users').dropIndex('email_1');
          console.log('Dropped legacy users email index');
        }
      }
    } catch (e) {
      console.error('Index cleanup error:', e);
    }

    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const employee = await Employee.create(data);
    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
