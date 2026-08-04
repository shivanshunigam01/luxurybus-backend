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

export const listBookings = async (query = {}) => {
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const commissionPct = settings?.vendorCommissionPercentage ?? 10;
  const filter = {};
  if (query.status) filter.rawStatus = query.status;
  if (query.paymentStatus === 'unpaid') filter.amountPaid = { $lte: 0 };
  if (query.vendorId) filter.vendorId = query.vendorId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.companyId) filter.companyId = query.companyId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  if (query.q) {
    const q = String(query.q).trim();
    filter.$or = [
      { searchText: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ...(q.match(/^[a-f0-9]{24}$/i) ? [{ _id: q }] : []),
    ];
  }
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('leadId')
      .populate('vendorId', 'companyName')
      .populate('customerId', 'name email phone')
      .populate('companyId', 'companyName')
      .lean(),
    Booking.countDocuments(filter),
  ]);
  let mapped = rows.map((b) => {
    const lead = b.leadId || {};
    const vendor = b.vendorId || {};
    const customer = b.customerId;
    const payStatus = paymentLabel(b);
    return {
      id: String(b._id),
      customer: (typeof customer === 'object' && customer?.name) || lead.guestName || 'Guest',
      customerEmail: (typeof customer === 'object' && customer?.email) || lead.guestEmail || '',
      customerPhone: (typeof customer === 'object' && customer?.phone) || lead.guestPhone || '',
      vendor: vendor.companyName || 'Vendor',
      vendorId: vendor._id ? String(vendor._id) : undefined,
      company: b.companyId?.companyName || null,
      companyId: b.companyId?._id ? String(b.companyId._id) : b.companyId ? String(b.companyId) : null,
      vehicle: lead.busType || '',
      route: `${lead.pickup || ''} → ${lead.drop || ''}`,
      amount: formatInr(b.totalWithGst),
      subtotal: formatInr(b.subtotal),
      gstAmount: formatInr(b.gstAmount),
      totalWithGst: formatInr(b.totalWithGst),
      paymentType: b.paymentType,
      paymentStatus: payStatus,
      status: b.rawStatus,
      date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—',
      payoutStatus: b.payoutStatus === 'paid' ? 'Paid' : b.payoutStatus === 'held' ? 'On hold' : b.payoutStatus,
      commissionDeducted: formatInr(b.commissionDeducted || vendorCommissionAmount(b.subtotal, commissionPct)),
      vendorPayout: formatInr(b.payoutAmount || vendorNetAfterCommission(b.subtotal, commissionPct)),
    };
  });
  if (query.paymentStatus === 'paid') mapped = mapped.filter((b) => b.paymentStatus === 'Paid in full');
  if (query.paymentStatus === 'partial') mapped = mapped.filter((b) => b.paymentStatus === 'Partial');
  return { total, page, limit, bookings: mapped };
};

export const getBookingDetail = async (id) => {
  const booking = await Booking.findById(id)
    .populate('leadId')
    .populate('quoteId')
    .populate('customerId', 'name email phone role')
    .populate('vendorId')
    .populate('companyId')
    .populate('assignedBusId')
    .lean();
  if (!booking) throw new ApiError(404, 'Booking not found');
  const { BookingEvent } = await import('../models/BookingEvent.js');
  const { Payment } = await import('../models/Payment.js');
  const { VendorPayout } = await import('../models/VendorPayout.js');
  const { Invoice } = await import('../models/Invoice.js');
  const [events, payments, payouts, invoice] = await Promise.all([
    BookingEvent.find({ bookingId: id }).sort({ createdAt: 1 }).lean(),
    Payment.find({ bookingId: id }).sort({ createdAt: -1 }).lean(),
    VendorPayout.find({ bookingIds: id }).sort({ createdAt: -1 }).lean(),
    Invoice.findOne({ bookingId: id }).lean(),
  ]);
  const lead = booking.leadId || {};
  const vendor = booking.vendorId || {};
  const customer = booking.customerId || {};
  const company = booking.companyId || null;
  const bus = booking.assignedBusId || null;
  return {
    booking: {
      id: String(booking._id),
      rawStatus: booking.rawStatus,
      displayStatus: booking.displayStatus || displayStatusFromRaw(booking.rawStatus),
      paymentStatus: paymentLabel(booking),
      paymentType: booking.paymentType,
      subtotal: booking.subtotal,
      gstAmount: booking.gstAmount,
      totalWithGst: booking.totalWithGst,
      amountPaid: booking.amountPaid,
      advanceRequired: booking.advanceRequired,
      payoutStatus: booking.payoutStatus,
      payoutAmount: booking.payoutAmount,
      commissionDeducted: booking.commissionDeducted,
      couponCode: booking.couponCode,
      discountAmount: booking.discountAmount,
      driver: booking.driver || {},
      createdAt: booking.createdAt,
    },
    lead,
    quote: booking.quoteId || null,
    customer: customer._id
      ? { id: String(customer._id), name: customer.name, email: customer.email, phone: customer.phone, role: customer.role }
      : null,
    vendor: vendor._id
      ? {
          id: String(vendor._id),
          companyName: vendor.companyName,
          phone: vendor.phone,
          email: vendor.email,
          city: vendor.city,
        }
      : null,
    company: company
      ? { id: String(company._id), companyName: company.companyName, gstin: company.gstin, email: company.email }
      : null,
    bus: bus
      ? { id: String(bus._id), name: bus.name, registrationNumber: bus.registrationNumber, type: bus.type }
      : null,
    payments: payments.map((p) => ({
      id: String(p._id),
      amount: p.amountPaise / 100,
      status: p.status,
      purpose: p.purpose,
      razorpayPaymentId: p.razorpayPaymentId,
      createdAt: p.createdAt,
    })),
    events: events.map((e) => ({
      id: String(e._id),
      type: e.type,
      message: e.message,
      meta: e.meta,
      createdAt: e.createdAt,
    })),
    payouts: payouts.map((p) => ({
      id: String(p._id),
      status: p.status,
      amountRequested: p.amountRequested,
      amountApproved: p.amountApproved,
      transactionId: p.transactionId,
    })),
    invoice: invoice
      ? { id: String(invoice._id), number: invoice.number, status: invoice.status, total: invoice.total }
      : null,
  };
};

export const updateBooking = async (id, payload, adminUserId = null) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  const { applyBookingStatusChange, appendBookingEvent, rebuildBookingSearchText } = await import(
    './bookingLifecycle.service.js'
  );
  if (payload.status) {
    await applyBookingStatusChange(booking, payload.status, { userId: adminUserId });
  }
  if (payload.driver) {
    booking.driver = {
      name: payload.driver.name ?? booking.driver?.name ?? '',
      phone: payload.driver.phone ?? booking.driver?.phone ?? '',
      license: payload.driver.license ?? booking.driver?.license ?? '',
    };
    await booking.save();
    await appendBookingEvent({
      bookingId: booking._id,
      type: 'driver',
      message: `Driver updated: ${booking.driver.name || '—'} (${booking.driver.phone || '—'})`,
      meta: booking.driver,
      createdBy: adminUserId,
    });
    await rebuildBookingSearchText(booking._id);
  }
  if (payload.assignedBusId) {
    booking.assignedBusId = payload.assignedBusId;
    await booking.save();
    await appendBookingEvent({
      bookingId: booking._id,
      type: 'assignment',
      message: `Bus assigned: ${payload.assignedBusId}`,
      meta: { assignedBusId: payload.assignedBusId },
      createdBy: adminUserId,
    });
    await rebuildBookingSearchText(booking._id);
  }
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
  const vendors = await Vendor.find().sort({ createdAt: -1 }).populate('userId', 'name email phone').lean();
  const busCounts = await Bus.aggregate([{ $group: { _id: '$vendorId', n: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] } } } }]);
  const busMap = Object.fromEntries(busCounts.map((b) => [String(b._id), b]));
  return {
    vendors: vendors.map((v) => {
      const bc = busMap[String(v._id)] || { n: 0, pending: 0 };
      const statusLabel =
        v.status === 'active'
          ? 'Active'
          : v.status === 'blocked'
            ? 'Blocked'
            : v.status === 'suspended'
              ? 'Suspended'
              : v.status === 'rejected'
                ? 'Rejected'
                : 'Pending';
      return {
        id: String(v._id),
        name: v.companyName,
        owner: v.ownerName || v.userId?.name || '—',
        email: v.userId?.email || '',
        phone: v.userId?.phone || '',
        city: v.city || '—',
        state: v.state || '',
        businessType: v.businessType || '',
        buses: bc.n || v.fleetSize || 0,
        pendingFleet: bc.pending || 0,
        documentsStatus: v.documentsStatus || 'incomplete',
        walletBalance: v.walletBalance || 0,
        registrationStep: v.registrationStep || 1,
        kyc:
          v.status === 'active'
            ? 'Approved'
            : v.status === 'pending'
              ? 'Pending'
              : v.status === 'suspended'
                ? 'Suspended'
                : 'Rejected',
        status: statusLabel,
        rawStatus: v.status,
        createdAt: v.createdAt,
      };
    }),
  };
};

export const updateVendor = async (id, payload, adminUser) => {
  const Portal = await import('./vendorPortal.service.js');
  return Portal.adminUpdateVendorStatus(id, payload, adminUser);
};

export const getVendorDetail = async (id) => {
  const Portal = await import('./vendorPortal.service.js');
  return Portal.adminGetVendorDetail(id);
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
  const subject = payload.subject || '';
  const body = payload.body || '';
  const audience = payload.audience || 'all';
  const { notifyChannels } = await import('./notify.service.js');
  const { sendEmail } = await import('../integrations/mailer.js');

  let recipients = [];
  if (audience === 'customers' || audience === 'all') {
    recipients = recipients.concat(await User.find({ role: 'customer', blocked: { $ne: true } }).select('email phone _id').lean());
  }
  if (audience === 'vendors' || audience === 'all') {
    const vendorUsers = await User.find({ role: 'vendor', blocked: { $ne: true } }).select('email phone _id').lean();
    recipients = recipients.concat(vendorUsers);
  }
  if (audience === 'b2b') {
    recipients = recipients.concat(await User.find({ role: 'b2b', blocked: { $ne: true } }).select('email phone _id').lean());
  }
  if (payload.to) {
    recipients = [{ email: payload.to, phone: payload.phone || '', _id: payload.userId || null }];
  }

  let sent = 0;
  for (const r of recipients.slice(0, 500)) {
    if (!r.email) continue;
    const result = await sendEmail({ to: r.email, subject, text: body });
    if (result.sent) sent += 1;
    if (r._id) {
      await notifyChannels({
        userId: r._id,
        email: '',
        subject,
        body,
        channels: ['inapp'],
        type: 'system',
      });
    }
  }

  const log = await NotificationLog.create({
    channel: 'email',
    subject,
    body,
    audience,
    message: body || subject,
    status: sent > 0 ? 'sent' : 'queued',
  });
  const { writeAudit } = await import('./audit.service.js');
  await writeAudit({
    action: 'notification.send',
    entityType: 'NotificationLog',
    entityId: String(log._id),
    message: `Broadcast email to ${audience} (${sent} delivered)`,
    meta: { sent, audience, channel: 'email' },
  });
  return { ok: true, id: String(log._id), sent };
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
