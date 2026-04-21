import { Booking } from '../models/Booking.js';
import { Vendor } from '../models/Vendor.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Cms } from '../models/Cms.js';
import { Setting } from '../models/Setting.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { Quote } from '../models/Quote.js';
import { Bus } from '../models/Bus.js';
import { ApiError } from '../utils/ApiError.js';
import { formatInr, displayStatusFromRaw } from '../utils/formatters.js';

const vendorCommissionAmount = (subtotal, pct) => (Number(subtotal) * Number(pct || 10)) / 100;
const vendorNetAfterCommission = (subtotal, pct) => Number(subtotal) - vendorCommissionAmount(subtotal, pct);

const paymentLabel = (b) => {
  const paid = Number(b.amountPaid || 0);
  const total = Number(b.totalWithGst || 0);
  if (paid >= total - 0.01) return 'Paid in full';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
};

export const getStats = async () => {
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const commissionPct = settings?.vendorCommissionPercentage ?? 10;
  const [totalUsers, vendors, bookings, buses] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Vendor.countDocuments(),
    Booking.find().lean(),
    Bus.countDocuments(),
  ]);
  const activeVendors = await Vendor.countDocuments({ status: 'active' });
  const revenue = bookings.reduce((s, b) => s + Number(b.totalWithGst || 0), 0);
  const commission = bookings.reduce((s, b) => s + vendorCommissionAmount(b.subtotal, commissionPct), 0);
  return {
    totalUsers,
    activeVendors,
    totalBookings: bookings.length,
    totalBuses: buses,
    revenueDisplay: formatInr(revenue),
    commissionDisplay: formatInr(commission),
    commissionPercent: commissionPct,
    gstEnabled: settings?.gstEnabled !== false,
  };
};

export const listBookings = async () => {
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const commissionPct = settings?.vendorCommissionPercentage ?? 10;
  const rows = await Booking.find().sort({ createdAt: -1 }).populate('leadId').populate('vendorId', 'companyName').populate('customerId', 'name').lean();
  return {
    bookings: rows.map((b) => {
      const lead = b.leadId || {};
      const vendor = b.vendorId || {};
      const customer = b.customerId;
      return {
        id: String(b._id),
        customer: (typeof customer === 'object' && customer?.name) || lead.guestName || 'Guest',
        vendor: vendor.companyName || 'Vendor',
        route: `${lead.pickup || ''} → ${lead.drop || ''}`,
        amount: formatInr(b.totalWithGst),
        subtotal: formatInr(b.subtotal),
        gstAmount: formatInr(b.gstAmount),
        totalWithGst: formatInr(b.totalWithGst),
        paymentType: b.paymentType,
        paymentStatus: paymentLabel(b),
        status: b.rawStatus,
        date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—',
        payoutStatus: b.payoutStatus === 'paid' ? 'Paid' : b.payoutStatus === 'held' ? 'On hold' : b.payoutStatus,
        commissionDeducted: formatInr(b.commissionDeducted || vendorCommissionAmount(b.subtotal, commissionPct)),
        vendorPayout: formatInr(b.payoutAmount || vendorNetAfterCommission(b.subtotal, commissionPct)),
      };
    }),
  };
};

export const updateBooking = async (id, payload) => {
  const status = payload.status;
  if (!status) throw new ApiError(400, 'status required');
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  booking.rawStatus = status;
  booking.displayStatus = displayStatusFromRaw(status);
  if (status === 'completed' && !booking.payoutOverride) booking.payoutStatus = 'ready';
  await booking.save();
  return { ok: true };
};

export const payoutOverride = async (id, body) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (body.action === 'hold') {
    booking.payoutOverride = true;
    booking.payoutStatus = 'held';
  } else {
    booking.payoutOverride = false;
    if (booking.rawStatus === 'completed') booking.payoutStatus = 'ready';
  }
  await booking.save();
  return { ok: true };
};

export const listVendors = async () => {
  const vendors = await Vendor.find().sort({ createdAt: -1 }).populate('userId', 'name').lean();
  return {
    vendors: vendors.map((v) => ({
      id: String(v._id),
      name: v.companyName,
      owner: v.userId?.name || '—',
      city: v.city || '—',
      buses: v.fleetSize || 0,
      kyc: v.status === 'active' ? 'Approved' : v.status === 'pending' ? 'Pending' : 'Rejected',
      status: v.status === 'active' ? 'Active' : v.status === 'blocked' ? 'Blocked' : v.status === 'rejected' ? 'Rejected' : 'Pending',
      rawStatus: v.status,
    })),
  };
};

export const updateVendor = async (id, payload) => {
  const vendor = await Vendor.findById(id);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (payload.status) vendor.status = payload.status;
  await vendor.save();
  return { ok: true };
};

export const listUsers = async () => {
  const users = await User.find({ role: 'customer' }).select('-passwordHash').sort({ createdAt: -1 }).lean();
  const bookings = await Booking.find().lean();
  return {
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      blocked: !!u.blocked,
      joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—',
      status: u.blocked ? 'Blocked' : 'Active',
      bookings: bookings.filter((b) => String(b.customerId) === String(u._id)).length,
    })),
  };
};

export const updateUser = async (id, payload) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (typeof payload.blocked === 'boolean') user.blocked = payload.blocked;
  await user.save();
  return { ok: true };
};

const payRowId = (bookingId) => `PAY-${String(bookingId).replace(/-/g, '').slice(-8).toUpperCase()}`;

const payoutStatusDisplay = (s) => {
  const m = { pending: 'Pending', ready: 'Pending', paid: 'Paid', held: 'On hold', refunded: 'Refunded' };
  return m[s] || s;
};

export const listPayments = async () => {
  const bookings = await Booking.find().populate('vendorId', 'companyName').lean();
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const commissionPct = settings?.vendorCommissionPercentage ?? 10;
  return {
    payments: bookings.map((b) => ({
      id: payRowId(b._id),
      booking: String(b._id).slice(-8),
      vendor: b.vendorId?.companyName || 'Vendor',
      amount: formatInr(b.totalWithGst),
      commission: formatInr(vendorCommissionAmount(b.subtotal, commissionPct)),
      payout: formatInr(vendorNetAfterCommission(b.subtotal, commissionPct)),
      status: payoutStatusDisplay(b.payoutStatus),
      date: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('en-IN') : '—',
      bookingId: String(b._id),
    })),
  };
};

export const refundPayment = async (payId) => {
  let booking = null;
  if (payId.startsWith('PAY-')) {
    const suffix = payId.slice(4).toLowerCase();
    const all = await Booking.find().lean();
    booking = all.find((b) => String(b._id).replace(/-/g, '').toLowerCase().endsWith(suffix)) || null;
  } else {
    booking = await Booking.findById(payId).lean();
  }
  if (booking) {
    const bdoc = await Booking.findById(booking._id);
    bdoc.payoutStatus = 'refunded';
    bdoc.rawStatus = 'cancelled';
    bdoc.displayStatus = displayStatusFromRaw('cancelled');
    await bdoc.save();
    await Payment.updateMany({ bookingId: bdoc._id }, { $set: { status: 'refunded' } });
    return { ok: true };
  }
  const payment = await Payment.findById(payId);
  if (!payment) throw new ApiError(404, 'Payment not found');
  payment.status = 'refunded';
  await payment.save();
  return { ok: true };
};

export const listCms = async () => {
  const items = await Cms.find().sort({ createdAt: -1 }).lean();
  return {
    items: items.map((i) => ({
      ...i,
      id: String(i._id),
      status: i.status === 'Published' || i.status === 'published' ? 'published' : i.status,
    })),
  };
};
export const createCms = async (payload) => Cms.create(payload);
export const updateCms = async (id, payload) => {
  const cms = await Cms.findByIdAndUpdate(id, payload, { new: true });
  if (!cms) throw new ApiError(404, 'CMS row not found');
  return cms;
};
export const deleteCms = async (id) => {
  const cms = await Cms.findById(id);
  if (!cms) throw new ApiError(404, 'CMS row not found');
  await cms.deleteOne();
  return { ok: true };
};

const mapSettingToDto = (s) => ({
  siteName: s.companyName || 'Luxury Bus Rental',
  legalName: s.companyName || '',
  about: s.about || '',
  operatingLocations: s.operatingLocations || '',
  contactPhone: s.contactPhone || '',
  contactEmail: s.contactEmail || '',
  gstNumber: s.gstNumber || '',
  gstEnabled: s.gstEnabled !== false,
  gstPercentage: s.gstPercentage ?? 18,
  commissionPercent: s.vendorCommissionPercentage ?? 10,
  quoteWindowHours: s.quoteWindowHours ?? 24,
  payoutType: s.payoutMode || 'automatic',
  payoutTrigger: s.payoutTrigger || 'completion',
});

export const getSettings = async () => {
  let settings = await Setting.findOne().sort({ createdAt: -1 });
  if (!settings) settings = await Setting.create({});
  return mapSettingToDto(settings);
};

export const updateSettings = async (payload) => {
  let settings = await Setting.findOne().sort({ createdAt: -1 });
  if (!settings) settings = new Setting({});
  const p = { ...payload };
  if (p.commissionPercent != null) {
    settings.vendorCommissionPercentage = Number(p.commissionPercent);
    delete p.commissionPercent;
  }
  if (p.name != null || p.legalName != null) {
    settings.companyName = p.name || p.legalName || settings.companyName;
    delete p.name;
    delete p.legalName;
  }
  if (p.operatingLocations != null) settings.operatingLocations = p.operatingLocations;
  if (p.about != null) settings.about = p.about;
  if (p.contactPhone != null) settings.contactPhone = p.contactPhone;
  if (p.contactEmail != null) settings.contactEmail = p.contactEmail;
  if (p.gstNumber != null) settings.gstNumber = p.gstNumber;
  if (p.gstEnabled != null) settings.gstEnabled = p.gstEnabled;
  if (p.gstPercentage != null) settings.gstPercentage = Number(p.gstPercentage);
  if (p.quoteWindowHours != null) settings.quoteWindowHours = Number(p.quoteWindowHours);
  if (p.payoutType != null) settings.payoutMode = p.payoutType;
  if (p.payoutTrigger != null) settings.payoutTrigger = p.payoutTrigger;
  await settings.save();
  return mapSettingToDto(settings);
};

export const listNotificationLogs = async () => {
  const logs = await NotificationLog.find().sort({ createdAt: -1 }).lean();
  return {
    logs: logs.map((l) => ({
      id: String(l._id),
      channel: l.channel || '',
      subject: l.subject || '',
      body: l.body || l.message || '',
      audience: l.audience || '',
      date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '—',
    })),
  };
};

export const sendNotification = async (payload) => {
  const log = await NotificationLog.create({
    channel: payload.channel || 'email',
    subject: payload.subject || '',
    body: payload.body || '',
    audience: payload.audience || '',
    message: payload.body || payload.subject || '',
  });
  return { ok: true, id: String(log._id) };
};

export const listQuotes = async () => {
  const quotes = await Quote.find().sort({ createdAt: -1 }).populate('leadId', 'pickup drop').populate('vendorId', 'companyName').lean();
  return {
    quotes: quotes.map((q) => ({
      id: String(q._id),
      vendor: q.vendorId?.companyName || 'Vendor',
      route: q.leadId ? `${q.leadId.pickup} → ${q.leadId.drop}` : '—',
      amount: formatInr(q.amount),
      status: q.status,
    })),
  };
};
