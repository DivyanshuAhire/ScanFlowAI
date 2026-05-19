import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  recipientType: 'CLINIC' | 'EMPLOYEE' | 'COMPANY';
  recipientId: mongoose.Types.ObjectId;
  type: 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  message: string;
  metadata?: any;
  whatsappMessageId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipientType: { type: String, enum: ['CLINIC', 'EMPLOYEE', 'COMPANY'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['WHATSAPP', 'EMAIL'], default: 'WHATSAPP' },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'DELIVERED'], default: 'PENDING' },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    whatsappMessageId: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
