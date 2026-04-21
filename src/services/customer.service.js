import { Booking } from '../models/Booking.js';
import { Quote } from '../models/Quote.js';
import { Review } from '../models/Review.js';
import { Lead } from '../models/Lead.js';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { Setting } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';
import { formatInr, displayStatusFromRaw, paymentLabelFromBooking } from '../utils/formatters.js';

const ADVANCE_FRAC = 0.3;

const ensureBookingOwner = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (String(booking.customerId) !== String(userId)) throw new ApiError(403, 'Access denied for this booking');
  return booking;
};

const gstBreakdown = (subtotal, settings) => {
  const gstEnabled = settings?.gstEnabled !== false;
  const pct = (settings?.gstPercentage ?? 18) / 100;
  const sub = Number(subtotal);
  if (!gstEnabled) return { subtotal: sub, gstAmount: 0, totalWithGst: sub };
  const gstAmount = Math.round(sub * pct * 100) / 100;
  return { subtotal: sub, gstAmount, totalWithGst: Math.round((sub + gstAmount) * 100) / 100 };
};

const bookingRef = (bookingId) => `LBR-${String(bookingId).replace(/-/g, '').slice(-8).toUpperCase()}`;

export const getDashboardStats = async (userId) => {
  const leadIds = await Lead.find({ customerId: userId }).distinct('_id');
  const [activeBookings, pendingQuotes, reviewsGiven] = await Promise.all([
    Booking.countDocuments({ customerId: userId, rawStatus: { $in: ['pending_payment', 'confirmed', 'on_trip'] } }),
    Quote.countDocuments({ leadId: { $in: leadIds }, status: 'pending' }),
    Review.countDocuments({ customerId: userId }),
  ]);
  return {
    activeBookings: String(activeBookings),
    pendingQuotes: String(pendingQuotes),
    reviewsGiven: String(reviewsGiven),
  };
};

export const getBookings = async (userId) => {
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const gstRatePercent = settings?.gstPercentage ?? 18;
  const rows = await Booking.find({ customerId: userId }).sort({ createdAt: -1 }).populate('leadId').populate('vendorId', 'companyName').lean();
  return {
    bookings: rows.map((b) => {
      const lead = b.leadId || {};
      const vendor = b.vendorId || {};
      const bal = Math.max(0, Number(b.totalWithGst) - Number(b.amountPaid || 0));
      return {
        id: String(b._id),
        from: lead.pickup || '',
        to: lead.drop || '',
        date: lead.journeyDate ? new Date(lead.journeyDate).toLocaleDateString('en-IN') : '—',
        bus: lead.busType || '—',
        vendor: vendor.companyName || 'Vendor',
        status: b.displayStatus || displayStatusFromRaw(b.rawStatus),
        rawStatus: b.rawStatus,
        amount: formatInr(b.totalWithGst),
        subtotal: formatInr(b.subtotal),
        gstAmount: formatInr(b.gstAmount),
        totalWithGst: formatInr(b.totalWithGst),
        paymentType: b.paymentType,
        advanceRequired: formatInr(b.advanceRequired),
        amountPaid: formatInr(b.amountPaid),
        balanceDue: formatInr(bal),
        paymentStatus: paymentLabelFromBooking(b),
        gstRatePercent,
      };
    }),
  };
};

export const cancelBooking = async (bookingId, userId) => {
  const booking = await ensureBookingOwner(bookingId, userId);
  booking.rawStatus = 'cancelled';
  booking.displayStatus = displayStatusFromRaw('cancelled');
  await booking.save();
  return { ok: true };
};

export const getQuotes = async (userId) => {
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const leadIds = await Lead.find({ customerId: userId }).distinct('_id');
  const quotes = await Quote.find({ leadId: { $in: leadIds }, status: 'pending' })
    .populate('vendorId', 'companyName rating')
    .populate('leadId', 'pickup drop busType')
    .sort({ createdAt: -1 })
    .lean();
  return {
    quotes: quotes.map((q) => {
      const lead = q.leadId || {};
      const vendor = q.vendorId || {};
      const totals = gstBreakdown(q.amount, settings);
      return {
        id: String(q._id),
        vendor: vendor.companyName || 'Vendor',
        route: `${lead.pickup || ''} → ${lead.drop || ''}`,
        bus: lead.busType || '—',
        price: formatInr(totals.totalWithGst),
        amount: totals.totalWithGst,
        quoteSubtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        totalWithGst: totals.totalWithGst,
        rating: vendor.rating ?? 4.2,
        responseTime: `${q.responseMinutes ?? 0} min`,
        responseMinutes: q.responseMinutes ?? 0,
        inclusions: q.inclusions ?? '',
      };
    }),
  };
};

export const acceptQuote = async (quoteId, userId, body = {}) => {
  if (!body.policyAccepted) throw new ApiError(400, 'You must accept the refund & cancellation policy.');
  const paymentType = body.paymentType === 'full' ? 'full' : 'advance';
  const quote = await Quote.findById(quoteId);
  if (!quote) throw new ApiError(404, 'Quote not found');
  const lead = await Lead.findById(quote.leadId);
  if (!lead || String(lead.customerId) !== String(userId)) throw new ApiError(403, 'Access denied for this quote');
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const totals = gstBreakdown(quote.amount, settings);
  const commissionRate = (settings?.vendorCommissionPercentage ?? 10) / 100;
  const commissionDeducted = totals.subtotal * commissionRate;
  const advanceRequired = paymentType === 'full' ? totals.totalWithGst : Math.round(totals.totalWithGst * ADVANCE_FRAC * 100) / 100;
  const payoutAmount = totals.subtotal - commissionDeducted;
  lead.acceptedQuoteId = quote._id;
  await lead.save();
  await Quote.updateMany({ leadId: lead._id, _id: { $ne: quote._id } }, { status: 'declined' });
  quote.status = 'accepted';
  await quote.save();
  const booking = await Booking.create({
    leadId: lead._id,
    quoteId: quote._id,
    customerId: userId,
    vendorId: quote.vendorId,
    subtotal: totals.subtotal,
    gstAmount: totals.gstAmount,
    totalWithGst: totals.totalWithGst,
    paymentType,
    advanceRequired,
    amountPaid: 0,
    rawStatus: 'pending_payment',
    displayStatus: displayStatusFromRaw('pending_payment'),
    commissionDeducted,
    payoutAmount,
  });
  return { ok: true, bookingId: String(booking._id), bookingRef: bookingRef(booking._id) };
};

export const declineQuote = async (quoteId, userId) => {
  const quote = await Quote.findById(quoteId);
  if (!quote) throw new ApiError(404, 'Quote not found');
  const lead = await Lead.findById(quote.leadId);
  if (!lead || String(lead.customerId) !== String(userId)) throw new ApiError(403, 'Access denied for this quote');
  quote.status = 'declined';
  await quote.save();
  return { ok: true };
};

export const getReviews = async (userId) => {
  const reviews = await Review.find({ customerId: userId }).sort({ createdAt: -1 }).lean();
  return {
    reviews: reviews.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
    })),
  };
};

export const createReview = async (payload, userId) => {
  if (payload.bookingId) {
    const booking = await ensureBookingOwner(payload.bookingId, userId);
    if (booking.rawStatus !== 'completed') throw new ApiError(400, 'Review can only be posted after trip completion');
    if (await Review.findOne({ bookingId: payload.bookingId, customerId: userId })) throw new ApiError(409, 'Review already exists');
    return Review.create({
      bookingId: payload.bookingId,
      customerId: userId,
      vendorId: payload.vendorId,
      rating: payload.rating,
      comment: payload.comment || '',
    });
  }
  const vendor = await Vendor.findById(payload.vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  return Review.create({
    bookingId: null,
    customerId: userId,
    vendorId: payload.vendorId,
    rating: payload.rating,
    comment: payload.comment || '',
  });
};

export const updateProfile = async (userId, payload) => {
  const user = await User.findByIdAndUpdate(userId, payload, { new: true });
  return { user: { id: String(user._id), email: user.email, name: user.name, phone: user.phone, role: user.role } };
};
