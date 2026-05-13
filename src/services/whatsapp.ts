import axios from 'axios';
import { Notification } from '@/models';

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;

export class WhatsAppService {
  static async sendTemplateMessage(to: string, templateName: string, components: any[]) {
    if (!WHATSAPP_API_KEY || !PHONE_NUMBER_ID) {
      console.warn('WhatsApp API credentials missing. Skipping notification.');
      return null;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Log notification
      await Notification.create({
        recipientType: 'EMPLOYEE', // Generic for now
        recipientId: new Object() as any, // Should be passed
        type: 'WHATSAPP',
        status: 'SENT',
        message: `Template: ${templateName}`,
        whatsappMessageId: response.data.messages[0].id,
      });

      return response.data;
    } catch (error: any) {
      console.error('WhatsApp API Error:', error.response?.data || error.message);
      return null;
    }
  }

  static async sendAppointmentAlert(phoneNumber: string, clinicName: string, area: string, time: string) {
    return this.sendTemplateMessage(phoneNumber, 'appointment_alert', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: clinicName },
          { type: 'text', text: area },
          { type: 'text', text: time },
        ],
      },
    ]);
  }
}
