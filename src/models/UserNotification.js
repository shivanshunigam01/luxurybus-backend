import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    type: { type: String, enum: ['info', 'booking', 'payment', 'payout', 'system', 'offer'], default: 'info' },
    href: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

schema.index({ userId: 1, createdAt: -1 });

export const UserNotification = mongoose.model('UserNotification', schema);
