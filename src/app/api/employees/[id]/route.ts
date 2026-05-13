import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Employee, User } from '@/models';
import bcrypt from 'bcryptjs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const data = await req.json();
    const { name, phoneNumber, password, assignedRouteId, status } = data;

    // 1. Find the employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // 2. Update Employee record
    employee.name = name || employee.name;
    employee.phoneNumber = phoneNumber || employee.phoneNumber;
    employee.assignedRouteId = assignedRouteId === '' ? undefined : (assignedRouteId || employee.assignedRouteId);
    employee.status = status || employee.status;
    await employee.save();

    // 3. Update associated User record
    const user = await User.findOne({ employeeId: id });
    if (user) {
      user.name = name || user.name;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }
      await user.save();
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // 1. Soft delete employee
    await Employee.findByIdAndUpdate(id, { isDeleted: true });

    // 2. Soft delete associated user
    await User.findOneAndUpdate({ employeeId: id }, { isDeleted: true });

    return NextResponse.json({ message: 'Employee deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
