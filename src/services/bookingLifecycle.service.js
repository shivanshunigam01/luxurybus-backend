import { Booking } from '../models/Booking.js';
import { BookingEvent } from '../models/BookingEvent.js';
import { Invoice } from '../models/Invoice.js';
import { Lead } from '../models/Lead.js';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { Bus } from '../models/Bus.js';
import { B2BCompany } from '../models/B2BCompany.js';
import { Setting } from '../models/Setting.js';
import { displayStatusFromRaw } from '../utils/formatters.js';

export const appendBookingEvent = async ({ bookingId, type, message, meta = {}, createdBy = null }) => {
  return BookingEvent.create({ bookingId, type, message, meta, createdBy });
};

export const rebuildBookingSearchText = async (bookingId) => {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) return;
  const [lead, customer, vendor, company, bus] = await Promise.all([
    booking.leadId ? Lead.findById(booking.leadId).lean() : null,
    booking.customerId ? User.findById(booking.customerId).lean() : null,
    booking.vendorId ? Vendor.findById(booking.vendorId).lean() : null,
    booking.companyId ? B2BCompany.findById(booking.companyId).lean() : null,
    booking.assignedBusId ? Bus.findById(booking.assignedBusId).lean() : null,
  ]);
  const parts = [
    String(booking._id),
    lead?.guestName,
    lead?.guestPhone,
    lead?.guestEmail,
    lead?.pickup,
    lead?.drop,
    lead?.vehicleType,
    customer?.name,
    customer?.email,
    customer?.phone,
    vendor?.companyName,
    company?.companyName,
    company?.email,
    company?.phone,
    bus?.name,
    bus?.registrationNumber,
    booking.driver?.name,
    booking.driver?.phone,
    booking.couponCode,
  ].filter(Boolean);
  await Booking.updateOne({ _id: bookingId }, { searchText: parts.join(' ').toLowerCase() });
};

export const nextInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const settings = await Setting.findOneAndUpdate(
    {},
    { $inc: { invoiceCounter: 1 }, $setOnInsert: { invoicePrefix: 'LBR-INV' } },
    { upsert: true, new: true, sort: { createdAt: -1 } },
  );
  const prefix = settings.invoicePrefix || 'LBR-INV';
  const seq = String(settings.invoiceCounter).padStart(6, '0');
  return `${prefix}-${year}-${seq}`;
};

export const ensureInvoiceForBooking = async (bookingId) => {
  const existing = await Invoice.findOne({ bookingId });
  if (existing) return existing;
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  if (!['confirmed', 'on_trip', 'completed'].includes(booking.rawStatus)) return null;

  const [settings, company] = await Promise.all([
    Setting.findOne().sort({ createdAt: -1 }).lean(),
    booking.companyId ? B2BCompany.findById(booking.companyId).lean() : null,
  ]);
  const number = await nextInvoiceNumber();
  return Invoice.create({
    number,
    bookingId: booking._id,
    companyId: booking.companyId || null,
    customerId: booking.customerId,
    vendorId: booking.vendorId,
    lineItems: [{ description: `Booking ${String(booking._id).slice(-8)}`, amount: booking.subtotal }],
    taxable: booking.subtotal,
    gstAmount: booking.gstAmount,
    total: booking.totalWithGst,
    gstinBuyer: company?.gstin || '',
    gstinSeller: settings?.gstNumber || '',
    status: 'issued',
    pdfMeta: { bookingRef: String(booking._id) },
  });
};

export const applyBookingStatusChange = async (booking, status, { userId = null, note = '' } = {}) => {
  const prev = booking.rawStatus;
  booking.rawStatus = status;
  booking.displayStatus = displayStatusFromRaw(status);
  if (status === 'completed' && !booking.payoutOverride) booking.payoutStatus = 'ready';
  await booking.save();
  await appendBookingEvent({
    bookingId: booking._id,
    type: 'status',
    message: note || `Status changed from ${prev} to ${status}`,
    meta: { from: prev, to: status },
    createdBy: userId,
  });
  if (['confirmed', 'on_trip', 'completed'].includes(status)) {
    await ensureInvoiceForBooking(booking._id);
  }
  await rebuildBookingSearchText(booking._id);
  return booking;
};
