import crypto from 'crypto';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { razorpay } from '../integrations/razorpay.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { displayStatusFromRaw } from '../utils/formatters.js';
const paise = (rupees) => Math.round(Number(rupees || 0) * 100);
const getAmountForPurpose = (booking, purpose) => { const remaining = booking.totalWithGst - booking.amountPaid; if (remaining <= 0) throw new ApiError(400, 'No payment pending'); if (purpose === 'full') return paise(remaining); if (purpose === 'advance') return paise(Math.max(booking.advanceRequired - booking.amountPaid, 0)); if (purpose === 'balance') return paise(remaining); throw new ApiError(400, 'Invalid payment purpose'); };
export const createRazorpayOrder = async ({ bookingId, purpose, userId }) => { const booking = await Booking.findById(bookingId); if (!booking) throw new ApiError(404, 'Booking not found'); if (String(booking.customerId) !== String(userId)) throw new ApiError(403, 'Access denied for this booking'); const amount = getAmountForPurpose(booking, purpose); if (amount <= 0) throw new ApiError(400, 'No payable amount for this purpose'); const order = await razorpay.orders.create({ amount, currency: 'INR', receipt: String(booking._id), notes: { bookingId: String(booking._id), purpose } }); await Payment.create({ bookingId: booking._id, razorpayOrderId: order.id, amountPaise: amount, currency: 'INR', purpose, status: 'created', raw: order }); return { id: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID }; };
export const verifyRazorpayPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }, userId) => {
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (expected !== razorpay_signature) throw new ApiError(400, 'Invalid Razorpay signature');
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) throw new ApiError(404, 'Payment order not found');
  const booking = await Booking.findById(payment.bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (userId && String(booking.customerId) !== String(userId)) throw new ApiError(403, 'Access denied for this payment');
  if (payment.status === 'paid') return { ok: true, bookingId: String(payment.bookingId), alreadyProcessed: true };
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.status = 'paid';
  payment.raw = { ...(payment.raw || {}), verifiedAt: new Date().toISOString(), razorpay_payment_id };
  await payment.save();
  booking.amountPaid += payment.amountPaise / 100;
  if (booking.amountPaid >= booking.advanceRequired && booking.rawStatus === 'pending_payment') {
    booking.rawStatus = 'confirmed';
  }
  booking.displayStatus = displayStatusFromRaw(booking.rawStatus);
  await booking.save();
  return { ok: true, bookingId: String(booking._id) };
};
export const handleWebhook = async (body, signature) => { const digest = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex'); if (digest !== signature) throw new ApiError(400, 'Invalid webhook signature'); const event = body.event; const entity = body.payload?.payment?.entity; if (event === 'payment.captured' && entity?.order_id) { const payment = await Payment.findOne({ razorpayOrderId: entity.order_id }); if (payment && payment.status !== 'paid') { payment.status = 'paid'; payment.razorpayPaymentId = entity.id; payment.raw = body; await payment.save(); const booking = await Booking.findById(payment.bookingId); if (booking) { booking.amountPaid += payment.amountPaise / 100; if (booking.amountPaid >= booking.advanceRequired && booking.rawStatus === 'pending_payment') { booking.rawStatus = 'confirmed'; } booking.displayStatus = displayStatusFromRaw(booking.rawStatus); await booking.save(); } } } if (event === 'refund.processed' && entity?.order_id) { const payment = await Payment.findOne({ razorpayOrderId: entity.order_id }); if (payment) { payment.status = 'refunded'; payment.raw = body; await payment.save(); } } return { ok: true }; };
