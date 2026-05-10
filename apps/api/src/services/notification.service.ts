import { prisma } from '@scanflow/db';

export class NotificationService {
  static async sendWhatsApp(phone: string, message: string) {
    console.log(`[WhatsApp] Sending to ${phone}: ${message}`);
    
    // Logic for WhatsApp Cloud API would go here
    // Example: axios.post('https://graph.facebook.com/v19.0/...', { ... })

    await prisma.notification.create({
      data: {
        recipientId: phone,
        message,
        type: 'WHATSAPP',
        deliveryStatus: 'SENT', // This would be updated via webhook in production
      }
    });
  }

  static async sendPush(userId: string, title: string, body: string) {
    console.log(`[Push] Sending to ${userId}: ${title} - ${body}`);

    // Logic for Firebase Cloud Messaging (FCM) would go here

    await prisma.notification.create({
      data: {
        recipientId: userId,
        message: `${title}: ${body}`,
        type: 'PUSH',
        deliveryStatus: 'SENT',
      }
    });
  }

  static async notifyAssignment(employeeId: string, appointmentId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });
    
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { clinic: true },
    });

    if (!employee || !appointment) return;

    const message = `New Appointment Assigned: ${appointment.patientName} at ${appointment.clinic.clinicName} on ${appointment.date.toLocaleDateString()}`;
    
    if (employee.user.phone) {
      await this.sendWhatsApp(employee.user.phone, message);
    }
    
    await this.sendPush(employee.userId, 'New Assignment', message);
  }
}
