import { B2BCompany } from '../models/B2BCompany.js';
import { B2BContract } from '../models/B2BContract.js';
import { B2BEmployee } from '../models/B2BEmployee.js';
import { FavouriteVehicle } from '../models/FavouriteVehicle.js';
import { Invoice } from '../models/Invoice.js';
import { Booking } from '../models/Booking.js';
import { Lead } from '../models/Lead.js';
import { Quote } from '../models/Quote.js';
import { User } from '../models/User.js';
import { Setting } from '../models/Setting.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { toPublicUser, formatInr, displayStatusFromRaw } from '../utils/formatters.js';
import { appendBookingEvent, rebuildBookingSearchText } from './bookingLifecycle.service.js';

const ADVANCE_FRAC = 0.3;

const gstBreakdown = (subtotal, settings) => {
  const gstEnabled = settings?.gstEnabled !== false;
  const pct = Number(settings?.gstPercentage ?? 18);
  const gstAmount = gstEnabled ? Math.round((Number(subtotal) * pct) / 100 * 100) / 100 : 0;
  return { subtotal: Number(subtotal), gstAmount, totalWithGst: Number(subtotal) + gstAmount };
};

const companyOfUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.role !== 'b2b' || !user.companyId) throw new ApiError(403, 'B2B access required');
  const company = await B2BCompany.findById(user.companyId);
  if (!company) throw new ApiError(404, 'Company not found');
  return { user, company };
};

const assertActiveCompany = (company) => {
  if (company.status === 'pending') throw new ApiError(403, 'Company pending admin approval');
  if (company.status === 'rejected') throw new ApiError(403, 'Company registration was rejected');
  if (company.status === 'suspended') throw new ApiError(403, 'Company account is suspended');
};

export const registerB2B = async (p) => {
  const email = p.email.toLowerCase();
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');
  if (p.gstin && (await B2BCompany.findOne({ gstin: p.gstin.toUpperCase() }))) {
    throw new ApiError(409, 'GSTIN already registered');
  }
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  const company = await B2BCompany.create({
    companyName: p.companyName,
    gstin: (p.gstin || '').toUpperCase(),
    pan: (p.pan || '').toUpperCase(),
    businessType: p.businessType || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    pin: p.pin || '',
    phone: p.companyPhone || p.phone || '',
    email: p.companyEmail || email,
    employeeCount: p.employeeCount || 0,
    status: 'pending',
    defaultDiscountPercent: settings?.b2bDefaultDiscountPercent ?? 5,
    creditLimit: 0,
  });
  const user = await User.create({
    email,
    passwordHash: await hashPassword(p.password),
    name: p.contactName || p.name,
    phone: p.phone || '',
    role: 'b2b',
    companyId: company._id,
  });
  company.primaryUserId = user._id;
  await company.save();
  await B2BEmployee.create({
    companyId: company._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: 'Admin',
    status: 'active',
  });
  return {
    token: signAccessToken({
      sub: String(user._id),
      role: 'b2b',
      vendorId: null,
      companyId: String(company._id),
    }),
    user: toPublicUser(user),
    company: {
      id: String(company._id),
      companyName: company.companyName,
      status: company.status,
    },
  };
};

export const getDashboard = async (userId) => {
  const { company } = await companyOfUser(userId);
  const bookings = await Booking.find({ companyId: company._id }).lean();
  const active = bookings.filter((b) => ['pending_payment', 'confirmed', 'on_trip'].includes(b.rawStatus)).length;
  const completed = bookings.filter((b) => b.rawStatus === 'completed').length;
  const spend = bookings.reduce((s, b) => s + Number(b.totalWithGst || 0), 0);
  const invoicesOpen = await Invoice.countDocuments({ companyId: company._id, status: { $in: ['issued', 'draft'] } });
  return {
    company: {
      id: String(company._id),
      companyName: company.companyName,
      status: company.status,
      walletBalance: company.walletBalance,
      creditLimit: company.creditLimit,
      defaultDiscountPercent: company.defaultDiscountPercent,
      gstin: company.gstin,
    },
    stats: {
      totalBookings: bookings.length,
      activeBookings: active,
      completedTrips: completed,
      totalSpendDisplay: formatInr(spend),
      openInvoices: invoicesOpen,
      employees: await B2BEmployee.countDocuments({ companyId: company._id, status: 'active' }),
    },
  };
};

export const getCompany = async (userId) => {
  const { company } = await companyOfUser(userId);
  return {
    company: {
      id: String(company._id),
      companyName: company.companyName,
      gstin: company.gstin,
      pan: company.pan,
      businessType: company.businessType,
      address: company.address,
      city: company.city,
      state: company.state,
      pin: company.pin,
      phone: company.phone,
      email: company.email,
      employeeCount: company.employeeCount,
      status: company.status,
      walletBalance: company.walletBalance,
      creditLimit: company.creditLimit,
      defaultDiscountPercent: company.defaultDiscountPercent,
      rejectionReason: company.rejectionReason,
    },
  };
};

export const listEmployees = async (userId) => {
  const { company } = await companyOfUser(userId);
  const rows = await B2BEmployee.find({ companyId: company._id }).sort({ createdAt: -1 }).lean();
  return {
    employees: rows.map((e) => ({
      id: String(e._id),
      name: e.name,
      email: e.email,
      phone: e.phone,
      department: e.department,
      status: e.status,
      userId: e.userId ? String(e.userId) : null,
    })),
  };
};

export const inviteEmployee = async (userId, body) => {
  const { company } = await companyOfUser(userId);
  assertActiveCompany(company);
  const email = body.email.toLowerCase();
  if (await B2BEmployee.findOne({ companyId: company._id, email })) {
    throw new ApiError(409, 'Employee already exists');
  }
  let user = await User.findOne({ email });
  if (user && user.role !== 'b2b') throw new ApiError(409, 'Email already used by another role');
  if (!user) {
    const tempPass = body.password || `B2B${Math.random().toString(36).slice(2, 10)}!`;
    user = await User.create({
      email,
      passwordHash: await hashPassword(tempPass),
      name: body.name,
      phone: body.phone || '',
      role: 'b2b',
      companyId: company._id,
    });
  } else {
    user.companyId = company._id;
    user.role = 'b2b';
    await user.save();
  }
  const emp = await B2BEmployee.create({
    companyId: company._id,
    userId: user._id,
    name: body.name,
    email,
    phone: body.phone || '',
    department: body.department || '',
    status: 'active',
  });
  return { ok: true, employeeId: String(emp._id), userId: String(user._id) };
};

export const updateEmployee = async (userId, empId, body) => {
  const { company } = await companyOfUser(userId);
  const emp = await B2BEmployee.findOne({ _id: empId, companyId: company._id });
  if (!emp) throw new ApiError(404, 'Employee not found');
  if (body.name != null) emp.name = body.name;
  if (body.phone != null) emp.phone = body.phone;
  if (body.department != null) emp.department = body.department;
  if (body.status != null) emp.status = body.status;
  await emp.save();
  return { ok: true };
};

export const listBookings = async (userId, query = {}) => {
  const { company } = await companyOfUser(userId);
  const filter = { companyId: company._id };
  if (query.status) filter.rawStatus = query.status;
  if (query.trips === '1') filter.rawStatus = { $in: ['on_trip', 'completed'] };
  const rows = await Booking.find(filter).sort({ createdAt: -1 }).populate('leadId').populate('vendorId', 'companyName').lean();
  return {
    bookings: rows.map((b) => {
      const lead = b.leadId || {};
      return {
        id: String(b._id),
        route: `${lead.pickup || ''} → ${lead.drop || ''}`,
        vendor: b.vendorId?.companyName || '—',
        amount: formatInr(b.totalWithGst),
        status: b.displayStatus || displayStatusFromRaw(b.rawStatus),
        rawStatus: b.rawStatus,
        date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—',
      };
    }),
  };
};

export const acceptQuoteForCompany = async (userId, quoteId, body = {}) => {
  const { company, user } = await companyOfUser(userId);
  assertActiveCompany(company);
  if (!body.policyAccepted) throw new ApiError(400, 'You must accept the refund & cancellation policy.');
  const paymentType = body.paymentType === 'full' ? 'full' : 'advance';
  const quote = await Quote.findById(quoteId);
  if (!quote) throw new ApiError(404, 'Quote not found');
  const lead = await Lead.findById(quote.leadId);
  if (!lead) throw new ApiError(404, 'Lead not found');
  if (lead.customerId && String(lead.customerId) !== String(userId) && String(lead.companyId || '') !== String(company._id)) {
    // allow if lead was created by same company user or marked company
  }
  const settings = await Setting.findOne().sort({ createdAt: -1 }).lean();
  let amount = quote.amount;
  const discountPct = company.defaultDiscountPercent || settings?.b2bDefaultDiscountPercent || 0;
  const discountAmount = Math.round((amount * discountPct) / 100);
  amount = Math.max(0, amount - discountAmount);
  const totals = gstBreakdown(amount, settings);
  const commissionRate = (settings?.vendorCommissionPercentage ?? 10) / 100;
  const commissionDeducted = totals.subtotal * commissionRate;
  const advanceRequired = paymentType === 'full' ? totals.totalWithGst : Math.round(totals.totalWithGst * ADVANCE_FRAC * 100) / 100;
  lead.acceptedQuoteId = quote._id;
  if (!lead.companyId) lead.companyId = company._id;
  await lead.save();
  await Quote.updateMany({ leadId: lead._id, _id: { $ne: quote._id } }, { status: 'declined' });
  quote.status = 'accepted';
  await quote.save();
  const booking = await Booking.create({
    leadId: lead._id,
    quoteId: quote._id,
    customerId: user._id,
    vendorId: quote.vendorId,
    companyId: company._id,
    couponCode: body.couponCode || '',
    discountAmount,
    subtotal: totals.subtotal,
    gstAmount: totals.gstAmount,
    totalWithGst: totals.totalWithGst,
    paymentType,
    advanceRequired,
    amountPaid: 0,
    rawStatus: 'pending_payment',
    displayStatus: displayStatusFromRaw('pending_payment'),
    commissionDeducted,
    payoutAmount: totals.subtotal - commissionDeducted,
  });
  await appendBookingEvent({
    bookingId: booking._id,
    type: 'status',
    message: 'Corporate booking created',
    meta: { companyId: String(company._id), discountAmount },
    createdBy: userId,
  });
  await rebuildBookingSearchText(booking._id);
  return { ok: true, bookingId: String(booking._id) };
};

export const listFavourites = async (userId) => {
  const { company } = await companyOfUser(userId);
  const rows = await FavouriteVehicle.find({ companyId: company._id }).sort({ createdAt: -1 }).lean();
  return {
    favourites: rows.map((f) => ({
      id: String(f._id),
      vehicleTypeSlug: f.vehicleTypeSlug,
      busId: f.busId ? String(f.busId) : null,
      label: f.label,
    })),
  };
};

export const addFavourite = async (userId, body) => {
  const { company } = await companyOfUser(userId);
  assertActiveCompany(company);
  const fav = await FavouriteVehicle.create({
    companyId: company._id,
    userId,
    vehicleTypeSlug: body.vehicleTypeSlug || '',
    busId: body.busId || null,
    label: body.label || body.vehicleTypeSlug || '',
  });
  return { ok: true, id: String(fav._id) };
};

export const removeFavourite = async (userId, id) => {
  const { company } = await companyOfUser(userId);
  await FavouriteVehicle.deleteOne({ _id: id, companyId: company._id });
  return { ok: true };
};

export const getWallet = async (userId) => {
  const { company } = await companyOfUser(userId);
  const payments = await Payment.find({
    bookingId: { $in: await Booking.find({ companyId: company._id }).distinct('_id') },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return {
    walletBalance: company.walletBalance,
    creditLimit: company.creditLimit,
    availableCredit: Math.max(0, company.creditLimit - company.walletBalance),
    history: payments.map((p) => ({
      id: String(p._id),
      amount: formatInr(p.amountPaise / 100),
      status: p.status,
      purpose: p.purpose,
      date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—',
    })),
  };
};

export const listContracts = async (userId) => {
  const { company } = await companyOfUser(userId);
  const rows = await B2BContract.find({ companyId: company._id }).sort({ createdAt: -1 }).lean();
  return {
    contracts: rows.map((c) => ({
      id: String(c._id),
      title: c.title,
      startDate: c.startDate,
      endDate: c.endDate,
      discountPercent: c.discountPercent,
      paymentTermsDays: c.paymentTermsDays,
      status: c.status,
      pricingRules: c.pricingRules,
      documentUrl: c.documentUrl,
      notes: c.notes,
    })),
  };
};

export const listInvoices = async (userId) => {
  const { company } = await companyOfUser(userId);
  const rows = await Invoice.find({ companyId: company._id }).sort({ createdAt: -1 }).lean();
  return {
    invoices: rows.map((inv) => ({
      id: String(inv._id),
      number: inv.number,
      bookingId: inv.bookingId ? String(inv.bookingId) : null,
      taxable: inv.taxable,
      gstAmount: inv.gstAmount,
      total: inv.total,
      totalDisplay: formatInr(inv.total),
      status: inv.status,
      gstinBuyer: inv.gstinBuyer,
      issuedAt: inv.issuedAt,
      lineItems: inv.lineItems,
    })),
  };
};

export const getInvoice = async (userId, id) => {
  const { company } = await companyOfUser(userId);
  const inv = await Invoice.findOne({ _id: id, companyId: company._id }).lean();
  if (!inv) throw new ApiError(404, 'Invoice not found');
  return { invoice: inv };
};

/* ---------- Admin B2B ---------- */

export const adminListCompanies = async (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const q = String(query.q).trim();
    filter.$or = [
      { companyName: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { gstin: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
    ];
  }
  const rows = await B2BCompany.find(filter).sort({ createdAt: -1 }).lean();
  return {
    companies: rows.map((c) => ({
      id: String(c._id),
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      gstin: c.gstin,
      status: c.status,
      walletBalance: c.walletBalance,
      creditLimit: c.creditLimit,
      employeeCount: c.employeeCount,
      createdAt: c.createdAt,
    })),
  };
};

export const adminGetCompany = async (id) => {
  const company = await B2BCompany.findById(id).lean();
  if (!company) throw new ApiError(404, 'Company not found');
  const [contracts, employees, bookings, invoices] = await Promise.all([
    B2BContract.find({ companyId: id }).lean(),
    B2BEmployee.find({ companyId: id }).lean(),
    Booking.find({ companyId: id }).sort({ createdAt: -1 }).limit(20).lean(),
    Invoice.find({ companyId: id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return {
    company: { ...company, id: String(company._id) },
    contracts,
    employees,
    bookings: bookings.map((b) => ({ id: String(b._id), status: b.rawStatus, total: b.totalWithGst })),
    invoices,
  };
};

export const adminUpdateCompanyStatus = async (id, body, adminUserId) => {
  const company = await B2BCompany.findById(id);
  if (!company) throw new ApiError(404, 'Company not found');
  if (body.status) company.status = body.status;
  if (body.creditLimit != null) company.creditLimit = Number(body.creditLimit);
  if (body.defaultDiscountPercent != null) company.defaultDiscountPercent = Number(body.defaultDiscountPercent);
  if (body.walletBalance != null) company.walletBalance = Number(body.walletBalance);
  if (body.status === 'active') {
    company.verifiedAt = new Date();
    company.rejectionReason = '';
  }
  if (body.status === 'rejected') company.rejectionReason = body.rejectionReason || body.remark || '';
  if (body.remark) {
    company.remarks.push({ by: adminUserId, byName: 'Admin', text: body.remark });
  }
  await company.save();
  const { writeAudit } = await import('./audit.service.js');
  await writeAudit({
    actorId: adminUserId,
    actorRole: 'admin',
    action: 'b2b.company.status',
    entityType: 'B2BCompany',
    entityId: String(company._id),
    message: `Company ${company.companyName} → ${company.status}`,
    meta: { status: company.status, creditLimit: company.creditLimit },
  });
  return { ok: true, status: company.status };
};

export const adminUpsertContract = async (companyId, body, id = null) => {
  const company = await B2BCompany.findById(companyId);
  if (!company) throw new ApiError(404, 'Company not found');
  let doc;
  if (id) {
    doc = await B2BContract.findOne({ _id: id, companyId });
    if (!doc) throw new ApiError(404, 'Contract not found');
    Object.assign(doc, {
      title: body.title ?? doc.title,
      startDate: body.startDate ?? doc.startDate,
      endDate: body.endDate ?? doc.endDate,
      pricingRules: body.pricingRules ?? doc.pricingRules,
      discountPercent: body.discountPercent ?? doc.discountPercent,
      paymentTermsDays: body.paymentTermsDays ?? doc.paymentTermsDays,
      status: body.status ?? doc.status,
      documentUrl: body.documentUrl ?? doc.documentUrl,
      notes: body.notes ?? doc.notes,
    });
    await doc.save();
  } else {
    doc = await B2BContract.create({
      companyId,
      title: body.title,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      pricingRules: body.pricingRules || [],
      discountPercent: body.discountPercent || 0,
      paymentTermsDays: body.paymentTermsDays || 30,
      status: body.status || 'active',
      documentUrl: body.documentUrl || '',
      notes: body.notes || '',
    });
  }
  return { ok: true, id: String(doc._id) };
};

export const adminDeleteContract = async (id) => {
  await B2BContract.deleteOne({ _id: id });
  return { ok: true };
};

export const adminListInvoices = async (query = {}) => {
  const filter = {};
  if (query.companyId) filter.companyId = query.companyId;
  if (query.status) filter.status = query.status;
  const rows = await Invoice.find(filter).sort({ createdAt: -1 }).populate('companyId', 'companyName').lean();
  return {
    invoices: rows.map((inv) => ({
      id: String(inv._id),
      number: inv.number,
      company: inv.companyId?.companyName || '—',
      companyId: inv.companyId?._id ? String(inv.companyId._id) : inv.companyId ? String(inv.companyId) : null,
      total: inv.total,
      totalDisplay: formatInr(inv.total),
      gstAmount: inv.gstAmount,
      status: inv.status,
      issuedAt: inv.issuedAt,
    })),
  };
};

export const adminMarkInvoicePaid = async (id) => {
  const inv = await Invoice.findById(id);
  if (!inv) throw new ApiError(404, 'Invoice not found');
  inv.status = 'paid';
  inv.paidAt = new Date();
  await inv.save();
  return { ok: true };
};

export const adminGstSummary = async (query = {}) => {
  const filter = { status: { $in: ['issued', 'paid'] } };
  if (query.companyId) filter.companyId = query.companyId;
  if (query.from || query.to) {
    filter.issuedAt = {};
    if (query.from) filter.issuedAt.$gte = new Date(query.from);
    if (query.to) filter.issuedAt.$lte = new Date(query.to);
  }
  const rows = await Invoice.find(filter).lean();
  const taxable = rows.reduce((s, r) => s + Number(r.taxable || 0), 0);
  const gst = rows.reduce((s, r) => s + Number(r.gstAmount || 0), 0);
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  return {
    count: rows.length,
    taxable,
    gstAmount: gst,
    total,
    taxableDisplay: formatInr(taxable),
    gstDisplay: formatInr(gst),
    totalDisplay: formatInr(total),
  };
};

export const adminCompanyReport = async (query = {}) => {
  const filter = {};
  if (query.companyId) filter.companyId = query.companyId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  const bookings = await Booking.find(filter).populate('companyId', 'companyName').lean();
  const byCompany = {};
  for (const b of bookings) {
    const cid = b.companyId ? String(b.companyId._id || b.companyId) : 'none';
    if (!byCompany[cid]) {
      byCompany[cid] = {
        companyId: cid === 'none' ? null : cid,
        companyName: b.companyId?.companyName || 'Retail',
        bookings: 0,
        revenue: 0,
      };
    }
    byCompany[cid].bookings += 1;
    byCompany[cid].revenue += Number(b.totalWithGst || 0);
  }
  return {
    rows: Object.values(byCompany).map((r) => ({
      ...r,
      revenueDisplay: formatInr(r.revenue),
    })),
  };
};
