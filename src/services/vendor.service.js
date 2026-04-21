import mongoose from 'mongoose';
import { Vendor } from '../models/Vendor.js';
import { Lead } from '../models/Lead.js';
import { Quote } from '../models/Quote.js';
import { Booking } from '../models/Booking.js';
import { Bus } from '../models/Bus.js';
import { Setting } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';
import { formatInr, displayStatusFromRaw } from '../utils/formatters.js';
import { uploadBufferToCloudinary, destroyFromCloudinary } from '../integrations/cloudinary.js';

const getVendorOrThrow = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  return vendor;
};

const vendorCommissionAmount = (subtotal, pct) => (Number(subtotal) * Number(pct || 10)) / 100;
const vendorNetAfterCommission = (subtotal, pct) => Number(subtotal) - vendorCommissionAmount(subtotal, pct);

/** Open leads for this vendor (city match + not rejected + no accepted quote yet). */
export const getVendorLeads = async (vendorId) => {
  const vendor = await getVendorOrThrow(vendorId);
  const vid = new mongoose.Types.ObjectId(String(vendorId));
  const cityPat = vendor.city ? new RegExp(vendor.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : /.*/;
  const citiesPat = vendor.operatingCities
    ? new RegExp(vendor.operatingCities.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    : /.*/;
  const leads = await Lead.find({
    acceptedQuoteId: null,
    rejectedByVendorIds: { $nin: [vid] },
    $or: [{ pickup: cityPat }, { pickup: citiesPat }],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return {
    leads: leads.map((l) => ({
      id: String(l._id),
      customer: l.guestName || 'Guest',
      from: l.pickup,
      to: l.drop,
      date: new Date(l.journeyDate).toLocaleDateString('en-IN'),
      passengers: l.passengers,
      bus: l.busType,
      purpose: l.purpose || '—',
      status: 'Open',
    })),
  };
};

export const rejectLead = async (leadId, vendorId) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new ApiError(404, 'Lead not found');
  const vid = new mongoose.Types.ObjectId(String(vendorId));
  if (!lead.rejectedByVendorIds.some((id) => String(id) === String(vid))) {
    lead.rejectedByVendorIds.push(vid);
    await lead.save();
  }
  return { ok: true };
};

export const getVendorQuotes = async (vendorId) => {
  const quotes = await Quote.find({ vendorId }).sort({ createdAt: -1 }).populate('leadId', 'pickup drop').lean();
  return {
    quotes: quotes.map((q) => ({
      id: String(q._id),
      lead: q.leadId ? `${q.leadId.pickup} → ${q.leadId.drop}` : '—',
      amount: formatInr(q.amount),
      status: q.status,
    })),
  };
};

export const createQuote = async (payload, vendorId) => {
  const lead = await Lead.findById(payload.leadId);
  if (!lead) throw new ApiError(404, 'Lead not found');
  if (await Quote.findOne({ leadId: payload.leadId, vendorId })) throw new ApiError(409, 'Quote already submitted for this lead');
  const responseMinutes = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
  return Quote.create({
    leadId: payload.leadId,
    vendorId,
    amount: payload.amount,
    inclusions: payload.inclusions || '',
    terms: payload.terms || '',
    responseMinutes,
  });
};

export const getDashboardStats = async (vendorId) => {
  const [totalBuses, leadPack, , confirmedBookings, , vendor] = await Promise.all([
    Bus.countDocuments({ vendorId }),
    getVendorLeads(vendorId),
    Booking.countDocuments({ vendorId }),
    Booking.countDocuments({ vendorId, rawStatus: { $in: ['confirmed', 'on_trip'] } }),
    Quote.countDocuments({ vendorId }),
    Vendor.findById(vendorId).lean(),
  ]);
  const completed = await Booking.find({ vendorId, rawStatus: 'completed' }).lean();
  const totalGross = completed.reduce((s, b) => s + Number(b.subtotal || 0), 0);
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const commissionPct = settings?.vendorCommissionPercentage ?? 10;
  const netAfter = completed.reduce((s, b) => s + vendorNetAfterCommission(b.subtotal, commissionPct), 0);
  const recentLeads = (leadPack.leads || []).slice(0, 5).map((l) => ({
    id: l.id,
    customer: l.customer,
    route: `${l.from} → ${l.to}`,
    date: l.date,
    bus: l.bus,
    status: l.status,
  }));
  return {
    totalBuses: String(totalBuses),
    activeLeads: String(leadPack.leads?.length ?? 0),
    confirmedBookings: String(confirmedBookings),
    totalEarnings: formatInr(totalGross),
    netAfterCommission: formatInr(netAfter),
    commissionPercent: commissionPct,
    payoutRule: 'Automatic payout after trip completion. Admin can hold or release payout.',
    avgRating: vendor?.rating != null ? String(vendor.rating) : '—',
    thisMonth: formatInr(totalGross),
    recentLeads,
  };
};

export const getProfile = async (vendorId) => getVendorOrThrow(vendorId);

export const updateProfile = async (vendorId, payload, file) => {
  const vendor = await getVendorOrThrow(vendorId);
  Object.assign(vendor, payload);
  if (file) {
    if (vendor.logoPublicId) await destroyFromCloudinary(vendor.logoPublicId).catch(() => null);
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/vendors');
    vendor.logoPublicId = up.public_id;
    vendor.logoUrl = up.secure_url;
  }
  await vendor.save();
  return vendor;
};

export const listBuses = async (vendorId) => Bus.find({ vendorId }).sort({ createdAt: -1 });

export const createBus = async (vendorId, payload, file) => {
  const data = { ...payload, vendorId };
  if (file) {
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/buses');
    data.imagePublicId = up.public_id;
    data.imageUrl = up.secure_url;
  }
  return Bus.create(data);
};

export const updateBus = async (busId, vendorId, payload, file) => {
  const bus = await Bus.findOne({ _id: busId, vendorId });
  if (!bus) throw new ApiError(404, 'Bus not found');
  Object.assign(bus, payload);
  if (file) {
    if (bus.imagePublicId) await destroyFromCloudinary(bus.imagePublicId).catch(() => null);
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/buses');
    bus.imagePublicId = up.public_id;
    bus.imageUrl = up.secure_url;
  }
  await bus.save();
  return bus;
};

export const deleteBus = async (busId, vendorId) => {
  const bus = await Bus.findOne({ _id: busId, vendorId });
  if (!bus) throw new ApiError(404, 'Bus not found');
  if (bus.imagePublicId) await destroyFromCloudinary(bus.imagePublicId).catch(() => null);
  await bus.deleteOne();
  return { ok: true };
};

const payoutStatusLabel = (s) => {
  const m = { pending: 'Pending', ready: 'Ready', paid: 'Paid', held: 'On hold' };
  return m[s] || s;
};

export const getBookings = async (vendorId) => {
  const rows = await Booking.find({ vendorId }).sort({ createdAt: -1 }).populate('leadId').lean();
  return {
    bookings: rows.map((b) => {
      const lead = b.leadId || {};
      const cust = lead.guestName || 'Guest';
      return {
        id: String(b._id),
        customer: cust,
        route: `${lead.pickup || ''} → ${lead.drop || ''}`,
        date: lead.journeyDate ? new Date(lead.journeyDate).toLocaleDateString('en-IN') : '—',
        bus: lead.busType || '—',
        amount: formatInr(b.totalWithGst),
        status: b.displayStatus || displayStatusFromRaw(b.rawStatus),
        rawStatus: b.rawStatus,
        payoutStatus: payoutStatusLabel(b.payoutStatus),
        commissionDeducted: formatInr(b.commissionDeducted || 0),
        netPayout: formatInr(b.payoutAmount || 0),
      };
    }),
  };
};

export const updateBookingStatus = async (bookingId, vendorId, rawStatus) => {
  const booking = await Booking.findOne({ _id: bookingId, vendorId });
  if (!booking) throw new ApiError(404, 'Booking not found');
  booking.rawStatus = rawStatus;
  booking.displayStatus = displayStatusFromRaw(rawStatus);
  if (rawStatus === 'completed' && !booking.payoutOverride) booking.payoutStatus = 'ready';
  await booking.save();
  return { ok: true };
};

export const getEarnings = async (vendorId) => {
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const commissionPct = settings?.vendorCommissionPercentage ?? 10;
  const mine = await Booking.find({ vendorId }).lean();
  const completed = mine.filter((b) => b.rawStatus === 'completed');
  const total = completed.reduce((s, b) => s + Number(b.subtotal || 0), 0);
  const net = completed.reduce((s, b) => s + Number(b.payoutAmount || vendorNetAfterCommission(b.subtotal, commissionPct)), 0);
  const tx = completed.map((b) => ({
    id: `TXN-${String(b._id).slice(-6)}`,
    booking: String(b._id).slice(-8),
    amount: formatInr(b.subtotal),
    commission: formatInr(b.commissionDeducted || vendorCommissionAmount(b.subtotal, commissionPct)),
    net: formatInr(b.payoutAmount || vendorNetAfterCommission(b.subtotal, commissionPct)),
    date: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('en-IN') : '—',
    status: payoutStatusLabel(b.payoutStatus),
  }));
  return {
    totalEarnings: formatInr(total),
    netPayoutTotal: formatInr(net),
    pendingPayments: mine.filter((b) => b.payoutStatus !== 'paid').length,
    thisMonth: formatInr(total),
    commissionDisplay: `${commissionPct}%`,
    payoutRule: 'Automatic payout after trip completion. Admin can hold or release payout.',
    transactions: tx,
  };
};
