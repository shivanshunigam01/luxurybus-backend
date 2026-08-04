import { Booking } from '../models/Booking.js';
import { Lead } from '../models/Lead.js';
import { Vendor } from '../models/Vendor.js';
import { Bus } from '../models/Bus.js';
import { Payment } from '../models/Payment.js';
import { Quote } from '../models/Quote.js';
import { User } from '../models/User.js';
import { cached } from '../utils/cache.js';
import { formatInr } from '../utils/formatters.js';

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const lastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
};

const fillSeries = (days, map, valueKey = 'value') =>
  days.map((date) => ({ date, [valueKey]: map[date] || 0 }));

export const getAdminAnalytics = async (query = {}) => {
  const days = Math.min(90, Math.max(7, Number(query.days || 30)));
  return cached(`analytics:admin:${days}`, 60_000, async () => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const dayKeys = lastNDays(days);

    const [bookings, leads, payments, vendors, buses, customers, quotes] = await Promise.all([
      Booking.find({ createdAt: { $gte: since } }).lean(),
      Lead.find({ createdAt: { $gte: since } }).lean(),
      Payment.find({ createdAt: { $gte: since }, status: 'paid' }).lean(),
      Vendor.find().lean(),
      Bus.find().lean(),
      User.countDocuments({ role: 'customer' }),
      Quote.find({ createdAt: { $gte: since } }).lean(),
    ]);

    const revenueByDay = {};
    const bookingsByDay = {};
    const leadsByDay = {};
    const statusMap = {};
    const vendorRevenue = {};

    for (const b of bookings) {
      const k = dayKey(b.createdAt);
      bookingsByDay[k] = (bookingsByDay[k] || 0) + 1;
      revenueByDay[k] = (revenueByDay[k] || 0) + Number(b.totalWithGst || 0);
      statusMap[b.rawStatus] = (statusMap[b.rawStatus] || 0) + 1;
      const vid = String(b.vendorId);
      vendorRevenue[vid] = (vendorRevenue[vid] || 0) + Number(b.totalWithGst || 0);
    }
    for (const l of leads) {
      const k = dayKey(l.createdAt);
      leadsByDay[k] = (leadsByDay[k] || 0) + 1;
    }

    const vendorName = Object.fromEntries(vendors.map((v) => [String(v._id), v.companyName]));
    const topVendors = Object.entries(vendorRevenue)
      .map(([id, revenue]) => ({ vendorId: id, vendor: vendorName[id] || 'Vendor', revenue, revenueDisplay: formatInr(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const fleetByType = {};
    for (const b of buses) {
      const t = b.type || 'other';
      fleetByType[t] = (fleetByType[t] || 0) + 1;
    }

    const paidAmount = payments.reduce((s, p) => s + Number(p.amountPaise || 0) / 100, 0);
    const gross = bookings.reduce((s, b) => s + Number(b.totalWithGst || 0), 0);

    return {
      days,
      summary: {
        bookings: bookings.length,
        leads: leads.length,
        quotes: quotes.length,
        customers,
        vendors: vendors.length,
        activeVendors: vendors.filter((v) => v.status === 'active').length,
        fleet: buses.length,
        grossRevenue: gross,
        grossRevenueDisplay: formatInr(gross),
        collected: paidAmount,
        collectedDisplay: formatInr(paidAmount),
        conversionRate: leads.length ? Math.round((bookings.length / leads.length) * 1000) / 10 : 0,
      },
      revenueSeries: fillSeries(dayKeys, revenueByDay, 'revenue'),
      bookingSeries: fillSeries(dayKeys, bookingsByDay, 'bookings'),
      leadSeries: fillSeries(dayKeys, leadsByDay, 'leads'),
      bookingStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      topVendors,
      fleetByType: Object.entries(fleetByType).map(([type, count]) => ({ type, count })),
      vendorStatus: [
        { status: 'active', count: vendors.filter((v) => v.status === 'active').length },
        { status: 'pending', count: vendors.filter((v) => v.status === 'pending').length },
        { status: 'suspended', count: vendors.filter((v) => v.status === 'suspended' || v.status === 'blocked').length },
      ],
    };
  });
};

export const getVendorAnalyticsDeep = async (vendorId, query = {}) => {
  const days = Math.min(90, Math.max(7, Number(query.days || 30)));
  const since = new Date();
  since.setDate(since.getDate() - days);
  const dayKeys = lastNDays(days);
  const [bookings, buses, quotes, leads] = await Promise.all([
    Booking.find({ vendorId, createdAt: { $gte: since } }).lean(),
    Bus.find({ vendorId }).lean(),
    Quote.find({ vendorId, createdAt: { $gte: since } }).lean(),
    Lead.find({ createdAt: { $gte: since } }).lean(),
  ]);
  const revenueByDay = {};
  const bookingsByDay = {};
  for (const b of bookings) {
    const k = dayKey(b.createdAt);
    bookingsByDay[k] = (bookingsByDay[k] || 0) + 1;
    revenueByDay[k] = (revenueByDay[k] || 0) + Number(b.payoutAmount || b.subtotal || 0);
  }
  const available = buses.filter((b) => b.approvalStatus === 'approved' || !b.approvalStatus).length;
  return {
    days,
    summary: {
      bookings: bookings.length,
      quotes: quotes.length,
      leadsVisible: leads.length,
      fleet: buses.length,
      availableBuses: available,
      earnings: bookings.reduce((s, b) => s + Number(b.payoutAmount || 0), 0),
    },
    revenueSeries: fillSeries(dayKeys, revenueByDay, 'revenue'),
    bookingSeries: fillSeries(dayKeys, bookingsByDay, 'bookings'),
    fleetUtilization: buses.map((b) => ({
      id: String(b._id),
      name: b.name || b.registrationNumber,
      trips: bookings.filter((x) => String(x.assignedBusId || '') === String(b._id)).length,
      approvalStatus: b.approvalStatus || 'approved',
    })),
  };
};
