import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    recipientType: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'admin' },
    recipientId: { type: mongoose.Schema.Types.ObjectId, default: null },
    channel: { type: String, enum: ['sms', 'email', 'whatsapp', 'push'], default: 'email' },
    /** Legacy / generic text */
    message: { type: String, default: '' },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    audience: { type: String, default: '' },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'sent' },
  },
  { timestamps: true },
);

export const NotificationLog = mongoose.model('NotificationLog', schema);
