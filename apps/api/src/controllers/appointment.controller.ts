import { Request, Response } from 'express';
import { prisma } from '@scanflow/db';
import { AssignmentEngine } from '../services/assignment.service';
import { NotificationService } from '../services/notification.service';
import { io } from '../index';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  clinicId: z.string(),
  patientName: z.string(),
  scanType: z.string(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  date: z.string().transform(str => new Date(str)),
  startTime: z.string().transform(str => new Date(str)),
  notes: z.string().optional(),
});

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const data = createAppointmentSchema.parse(req.body);
    
    // Transactional operation
    const appointment = await prisma.$transaction(async (tx) => {
      const app = await tx.appointment.create({
        data,
        include: { clinic: true },
      });

      // Log activity
      await tx.activityTimeline.create({
        data: {
          appointmentId: app.id,
          status: 'PENDING',
          notes: 'Appointment created',
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: req.user?.userId,
          action: 'CREATE',
          entity: 'APPOINTMENT',
          entityId: app.id,
          metadata: data as any,
        }
      });

      return app;
    });

    // Auto-assign
    const bestEmployee = await AssignmentEngine.findBestEmployee(appointment.id);
    if (bestEmployee) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { 
          employeeId: bestEmployee.id,
          status: 'ASSIGNED'
        }
      });

      await NotificationService.notifyAssignment(bestEmployee.id, appointment.id);
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create appointment' });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    await prisma.activityTimeline.create({
      data: {
        appointmentId: id,
        status,
        notes,
      }
    });

    // Notify real-time clients
    io.to(`appointment:${id}`).emit('status-updated', { id, status, notes });

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update status' });
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  const { role, userId } = req.user!;
  
  const where: any = {};
  if (role === 'EMPLOYEE') {
    where.employee = { userId };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { clinic: true, employee: { include: { user: true } } },
    orderBy: { date: 'desc' },
  });

  res.json(appointments);
};
