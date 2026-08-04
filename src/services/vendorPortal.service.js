import { Vendor } from '../models/Vendor.js';
import { Bus } from '../models/Bus.js';
import { Booking } from '../models/Booking.js';
import { Lead } from '../models/Lead.js';
import { Quote } from '../models/Quote.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { VendorWalletTransaction } from '../models/VendorWalletTransaction.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadBufferToCloudinary, destroyFromCloudinary } from '../integrations/cloudinary.js';
import { sendEmail } from '../integrations/mailer.js';
import { normalizeBusPayload } from './content.service.js';
import { formatInr } from '../utils/formatters.js';

const DOC_KEYS = [
  'aadhar',
  'pan',
  'gst',
  'drivingLicense',
  'rc',
  'insurance',
  'businessProof',
  'cancelledCheque',
];

const getVendorOrThrow = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  return vendor;
};

const notifyVendor = async (vendor, subject, body) => {
  const user = await User.findById(vendor.userId).select('email name');
  if (user?.email) {
    await sendEmail({ to: user.email, subject, text: body });
  }
  await NotificationLog.create({
    recipientType: 'vendor',
    recipientId: vendor._id,
    channel: 'email',
    subject,
    body,
    message: body,
    audience: 'vendor',
    status: 'queued',
  });
};

export const getVendorPortalProfile = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  const user = await User.findById(vendor.userId).select('email name phone').lean();
  return {
    ...vendor,
    id: String(vendor._id),
    email: user?.email || '',
    phone: user?.phone || '',
    contactName: user?.name || vendor.ownerName || '',
  };
};

export const updateOnboardingAddress = async (vendorId, payload) => {
  const vendor = await getVendorOrThrow(vendorId);
  Object.assign(vendor, {
    gstNumber: payload.gstNumber ?? vendor.gstNumber,
    panNumber: payload.panNumber ?? vendor.panNumber,
    address: payload.address ?? vendor.address,
    city: payload.city ?? vendor.city,
    state: payload.state ?? vendor.state,
    pin: payload.pin ?? vendor.pin,
    operatingCities: payload.operatingCities ?? vendor.operatingCities,
    bankHolder: payload.bankHolder ?? vendor.bankHolder,
    bankAccount: payload.bankAccount ?? vendor.bankAccount,
    bankIfsc: payload.bankIfsc ?? vendor.bankIfsc,
    bankName: payload.bankName ?? vendor.bankName,
  });
  if (vendor.registrationStep < 2) vendor.registrationStep = 2;
  await vendor.save();
  return getVendorPortalProfile(vendorId);
};

export const uploadVendorDocument = async (vendorId, docKey, file) => {
  if (!DOC_KEYS.includes(docKey) && docKey !== 'vehicleImages') {
    throw new ApiError(400, 'Invalid document type');
  }
  if (!file) throw new ApiError(400, 'File required');
  const vendor = await getVendorOrThrow(vendorId);
  const up = await uploadBufferToCloudinary(file.buffer, `luxurybus/vendors/${vendorId}/docs`);

  if (docKey === 'vehicleImages') {
    vendor.documents.vehicleImages = vendor.documents.vehicleImages || [];
    vendor.documents.vehicleImages.push({
      url: up.secure_url,
      publicId: up.public_id,
      fileName: file.originalname || '',
      status: 'pending',
      uploadedAt: new Date(),
    });
  } else {
    const prev = vendor.documents[docKey];
    if (prev?.publicId) await destroyFromCloudinary(prev.publicId).catch(() => null);
    vendor.documents[docKey] = {
      url: up.secure_url,
      publicId: up.public_id,
      fileName: file.originalname || '',
      status: 'pending',
      uploadedAt: new Date(),
      remark: '',
      reviewedAt: null,
    };
  }
  vendor.documentsStatus = 'pending_review';
  if (vendor.registrationStep < 3) vendor.registrationStep = 3;
  await vendor.save();
  return getVendorPortalProfile(vendorId);
};

export const completeOnboarding = async (vendorId) => {
  const vendor = await getVendorOrThrow(vendorId);
  vendor.registrationStep = 4;
  vendor.documentsStatus = vendor.documentsStatus === 'incomplete' ? 'pending_review' : vendor.documentsStatus;
  await vendor.save();
  await notifyVendor(
    vendor,
    'Vendor application received — Luxury Bus Rental',
    `Hi ${vendor.ownerName || vendor.companyName}, your vendor application is under review. We typically verify within 24 hours.`,
  );
  return getVendorPortalProfile(vendorId);
};

export const listVendorNotifications = async (vendorId) => {
  const rows = await NotificationLog.find({
    $or: [{ recipientId: vendorId }, { audience: 'vendor' }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return {
    items: rows.map((n) => ({
      id: String(n._id),
      subject: n.subject || n.message,
      body: n.body || n.message,
      channel: n.channel,
      status: n.status,
      date: n.createdAt,
    })),
  };
};

export const getVendorAnalytics = async (vendorId) => {
  const [bookings, quotes, leads, buses, walletTx] = await Promise.all([
    Booking.find({ vendorId }).lean(),
    Quote.find({ vendorId }).lean(),
    Lead.find({}).limit(200).lean(),
    Bus.find({ vendorId }).lean(),
    VendorWalletTransaction.find({ vendorId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const revenue = bookings.reduce((s, b) => s + Number(b.totalWithGst || 0), 0);
  const completed = bookings.filter((b) => b.rawStatus === 'completed').length;
  const pendingPay = bookings.filter((b) => b.rawStatus === 'pending_payment').length;
  return {
    stats: {
      totalBookings: bookings.length,
      completedBookings: completed,
      pendingPayment: pendingPay,
      quotesSent: quotes.length,
      fleetCount: buses.length,
      approvedFleet: buses.filter((b) => b.approvalStatus === 'approved').length,
      revenue,
      revenueDisplay: formatInr(revenue),
      openLeads: leads.length,
    },
    recentTransactions: walletTx.map((t) => ({
      id: String(t._id),
      type: t.type,
      amount: t.amount,
      amountDisplay: formatInr(t.amount),
      balanceAfter: t.balanceAfter,
      note: t.note,
      date: t.createdAt,
    })),
  };
};

export const getVendorWallet = async (vendorId) => {
  const vendor = await getVendorOrThrow(vendorId);
  const tx = await VendorWalletTransaction.find({ vendorId }).sort({ createdAt: -1 }).limit(100).lean();
  return {
    balance: vendor.walletBalance || 0,
    balanceDisplay: formatInr(vendor.walletBalance || 0),
    transactions: tx.map((t) => ({
      id: String(t._id),
      type: t.type,
      amount: t.amount,
      amountDisplay: formatInr(t.amount),
      balanceAfter: t.balanceAfter,
      note: t.note,
      reference: t.reference,
      date: t.createdAt,
    })),
  };
};

export const createVendorBus = async (vendorId, payload, files = []) => {
  const data = await normalizeBusPayload(payload);
  data.vendorId = vendorId;
  data.name = payload.name || data.busType;
  data.model = payload.model || '';
  data.fuelType = payload.fuelType || 'diesel';
  data.transmission = payload.transmission || 'manual';
  data.amenities = Array.isArray(payload.amenities)
    ? payload.amenities
    : typeof payload.amenities === 'string'
      ? payload.amenities.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  data.approvalStatus = 'pending';
  if (payload.availabilityCalendar) {
    data.availabilityCalendar =
      typeof payload.availabilityCalendar === 'string'
        ? JSON.parse(payload.availabilityCalendar)
        : payload.availabilityCalendar;
  }
  const fileList = Array.isArray(files) ? files : files ? [files] : [];
  if (fileList.length) {
    const uploaded = [];
    for (const file of fileList) {
      const up = await uploadBufferToCloudinary(file.buffer, `luxurybus/buses/${vendorId}`);
      uploaded.push({ url: up.secure_url, publicId: up.public_id });
    }
    data.images = uploaded;
    data.imageUrl = uploaded[0]?.url || '';
    data.imagePublicId = uploaded[0]?.publicId || '';
  }
  const bus = await Bus.create(data);
  await Vendor.findByIdAndUpdate(vendorId, {
    $inc: { fleetSize: 1 },
    $max: { registrationStep: 4 },
  });
  return bus;
};

export const updateVendorBus = async (busId, vendorId, payload, files = []) => {
  const bus = await Bus.findOne({ _id: busId, vendorId });
  if (!bus) throw new ApiError(404, 'Fleet vehicle not found');
  const normalized = await normalizeBusPayload({
    busType: payload.busType ?? bus.busType,
    vehicleTypeSlug: payload.vehicleTypeSlug ?? bus.vehicleTypeSlug,
    seats: payload.seats ?? bus.seats,
    ac: payload.ac ?? bus.ac,
    pricingPerKm: payload.pricingPerKm ?? bus.pricingPerKm,
    pricingPerDay: payload.pricingPerDay ?? bus.pricingPerDay,
    availability: payload.availability ?? bus.availability,
    registrationNumber: payload.registrationNumber ?? bus.registrationNumber,
  });
  Object.assign(bus, normalized);
  if (payload.name != null) bus.name = payload.name;
  if (payload.model != null) bus.model = payload.model;
  if (payload.fuelType != null) bus.fuelType = payload.fuelType;
  if (payload.transmission != null) bus.transmission = payload.transmission;
  if (payload.amenities != null) {
    bus.amenities = Array.isArray(payload.amenities)
      ? payload.amenities
      : String(payload.amenities)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  }
  if (payload.availabilityCalendar != null) {
    bus.availabilityCalendar =
      typeof payload.availabilityCalendar === 'string'
        ? JSON.parse(payload.availabilityCalendar)
        : payload.availabilityCalendar;
  }
  const fileList = Array.isArray(files) ? files : files ? [files] : [];
  if (fileList.length) {
    for (const file of fileList) {
      const up = await uploadBufferToCloudinary(file.buffer, `luxurybus/buses/${vendorId}`);
      bus.images.push({ url: up.secure_url, publicId: up.public_id });
    }
    if (!bus.imageUrl && bus.images[0]) {
      bus.imageUrl = bus.images[0].url;
      bus.imagePublicId = bus.images[0].publicId;
    }
  }
  // Re-approval if material change
  if (payload.registrationNumber || payload.vehicleTypeSlug || payload.busType) {
    bus.approvalStatus = 'pending';
  }
  await bus.save();
  return bus;
};

export const updateBusCalendar = async (busId, vendorId, days) => {
  const bus = await Bus.findOne({ _id: busId, vendorId });
  if (!bus) throw new ApiError(404, 'Fleet vehicle not found');
  bus.availabilityCalendar = Array.isArray(days) ? days : [];
  await bus.save();
  return bus;
};

/* ---------------- Admin vendor portal ---------------- */

export const adminGetVendorDetail = async (id) => {
  const vendor = await Vendor.findById(id).populate('userId', 'name email phone blocked').lean();
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  const buses = await Bus.find({ vendorId: id }).sort({ createdAt: -1 }).lean();
  const tx = await VendorWalletTransaction.find({ vendorId: id }).sort({ createdAt: -1 }).limit(50).lean();
  return {
    vendor: {
      ...vendor,
      id: String(vendor._id),
      owner: vendor.userId?.name || vendor.ownerName,
      email: vendor.userId?.email,
      phone: vendor.userId?.phone,
    },
    fleet: buses.map((b) => ({
      ...b,
      id: String(b._id),
    })),
    transactions: tx,
  };
};

export const adminUpdateVendorStatus = async (id, payload, adminUser) => {
  const vendor = await getVendorOrThrow(id);
  if (payload.status) {
    vendor.status = payload.status;
    if (payload.status === 'active') {
      vendor.verifiedAt = new Date();
      vendor.rejectionReason = '';
    }
    if (payload.status === 'suspended') vendor.suspendedAt = new Date();
    if (payload.status === 'rejected') vendor.rejectionReason = payload.rejectionReason || payload.remark || '';
  }
  if (payload.remark || payload.rejectionReason) {
    vendor.remarks.push({
      by: adminUser?.sub,
      byName: 'Admin',
      text: payload.remark || payload.rejectionReason,
      createdAt: new Date(),
    });
  }
  await vendor.save();
  const statusMsg = {
    active: 'Your vendor account has been approved. You can now receive leads.',
    rejected: `Your vendor application was rejected. ${vendor.rejectionReason || ''}`.trim(),
    suspended: 'Your vendor account has been suspended. Contact support.',
    blocked: 'Your vendor account has been blocked.',
    pending: 'Your vendor account is pending review.',
  };
  if (payload.status) {
    await notifyVendor(vendor, `Vendor status: ${payload.status}`, statusMsg[payload.status] || `Status updated to ${payload.status}`);
  }
  return adminGetVendorDetail(id);
};

export const adminReviewDocument = async (vendorId, docKey, { status, remark }, adminUser) => {
  if (!DOC_KEYS.includes(docKey) && docKey !== 'vehicleImages') throw new ApiError(400, 'Invalid document');
  const vendor = await getVendorOrThrow(vendorId);
  if (docKey === 'vehicleImages') {
    vendor.documents.vehicleImages = (vendor.documents.vehicleImages || []).map((d) => ({
      ...d.toObject?.() || d,
      status,
      remark: remark || '',
      reviewedAt: new Date(),
    }));
  } else {
    if (!vendor.documents[docKey]?.url) throw new ApiError(400, 'Document not uploaded');
    vendor.documents[docKey].status = status;
    vendor.documents[docKey].remark = remark || '';
    vendor.documents[docKey].reviewedAt = new Date();
  }
  const docs = DOC_KEYS.map((k) => vendor.documents[k]?.status);
  if (docs.every((s) => s === 'approved')) vendor.documentsStatus = 'approved';
  else if (docs.some((s) => s === 'rejected')) vendor.documentsStatus = 'rejected';
  else if (docs.some((s) => s === 'pending' || s === 'approved')) vendor.documentsStatus = 'pending_review';
  if (remark) {
    vendor.remarks.push({ by: adminUser?.sub, byName: 'Admin', text: `Doc ${docKey}: ${remark}`, createdAt: new Date() });
  }
  await vendor.save();
  await notifyVendor(vendor, `Document ${docKey} ${status}`, `Your ${docKey} document was ${status}. ${remark || ''}`);
  return adminGetVendorDetail(vendorId);
};

export const adminReviewFleet = async (busId, { status, remark }) => {
  const bus = await Bus.findById(busId);
  if (!bus) throw new ApiError(404, 'Fleet vehicle not found');
  bus.approvalStatus = status;
  bus.approvalRemark = remark || '';
  await bus.save();
  const vendor = await Vendor.findById(bus.vendorId);
  if (vendor) {
    await notifyVendor(vendor, `Fleet ${status}`, `Vehicle ${bus.registrationNumber} was ${status}. ${remark || ''}`);
  }
  return bus;
};

export const adminWalletAdjust = async (vendorId, { type, amount, note }, adminUser) => {
  const vendor = await getVendorOrThrow(vendorId);
  const amt = Math.abs(Number(amount) || 0);
  if (!amt) throw new ApiError(400, 'Amount required');
  const isCredit = type === 'credit' || type === 'payout';
  const next = isCredit ? (vendor.walletBalance || 0) + amt : (vendor.walletBalance || 0) - amt;
  if (next < 0) throw new ApiError(400, 'Insufficient wallet balance');
  vendor.walletBalance = next;
  await vendor.save();
  const tx = await VendorWalletTransaction.create({
    vendorId,
    type: type || (isCredit ? 'credit' : 'debit'),
    amount: amt,
    balanceAfter: next,
    note: note || '',
    createdBy: adminUser?.sub,
  });
  return { balance: next, transaction: tx };
};

export const adminAddRemark = async (vendorId, text, adminUser) => {
  const vendor = await getVendorOrThrow(vendorId);
  vendor.remarks.push({ by: adminUser?.sub, byName: 'Admin', text, createdAt: new Date() });
  await vendor.save();
  return adminGetVendorDetail(vendorId);
};

export { DOC_KEYS, notifyVendor };
