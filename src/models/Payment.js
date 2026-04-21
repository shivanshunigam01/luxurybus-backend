import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: '' },
  amountPaise: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  purpose: { type: String, enum: ['advance', 'balance', 'full'], required: true },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
  raw: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });
export const Payment = mongoose.model('Payment', schema);
