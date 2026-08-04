import { Driver } from '../models/Driver.js';
import { Booking } from '../models/Booking.js';
import { Bus } from '../models/Bus.js';
import { ApiError } from '../utils/ApiError.js';
import { appendBookingEvent, rebuildBookingSearchText } from './bookingLifecycle.service.js';
import { parsePagination, paginatedResult } from '../utils/pagination.js';
import { notifyChannels } from './notify.service.js';
import { User } from '../models/User.js';

export const listDrivers = async (vendorId, query = {}) => {
  const filter = vendorId ? { vendorId } : {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(String(query.q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { licenseNumber: rx }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [rows, total] = await Promise.all([
    Driver.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignedBusId', 'name registrationNumber').lean(),
    Driver.countDocuments(filter),
  ]);
  return paginatedResult({
    items: rows.map((d) => ({
      id: String(d._id),
      vendorId: String(d.vendorId),
      name: d.name,
      phone: d.phone,
      email: d.email,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry,
      experienceYears: d.experienceYears,
      status: d.status,
      assignedBusId: d.assignedBusId?._id ? String(d.assignedBusId._id) : d.assignedBusId ? String(d.assignedBusId) : null,
      assignedBus: d.assignedBusId?.name || d.assignedBusId?.registrationNumber || null,
      ratingAvg: d.ratingAvg,
      tripCount: d.tripCount,
      notes: d.notes,
    })),
    total,
    page,
    limit,
  });
};

export const createDriver = async (vendorId, body) => {
  if (await Driver.findOne({ vendorId, phone: body.phone })) throw new ApiError(409, 'Driver phone already exists');
  const d = await Driver.create({
    vendorId,
    name: body.name,
    phone: body.phone,
    email: body.email || '',
    licenseNumber: body.licenseNumber || '',
    licenseExpiry: body.licenseExpiry || null,
    experienceYears: Number(body.experienceYears || 0),
    status: body.status || 'active',
    assignedBusId: body.assignedBusId || null,
    notes: body.notes || '',
  });
  return { ok: true, id: String(d._id) };
};

export const updateDriver = async (id, vendorId, body) => {
  const filter = vendorId ? { _id: id, vendorId } : { _id: id };
  const d = await Driver.findOne(filter);
  if (!d) throw new ApiError(404, 'Driver not found');
  const fields = ['name', 'phone', 'email', 'licenseNumber', 'status', 'notes', 'assignedBusId'];
  for (const f of fields) {
    if (body[f] !== undefined) d[f] = body[f];
  }
  if (body.licenseExpiry !== undefined) d.licenseExpiry = body.licenseExpiry || null;
  if (body.experienceYears !== undefined) d.experienceYears = Number(body.experienceYears);
  await d.save();
  return { ok: true };
};

export const deleteDriver = async (id, vendorId) => {
  const filter = vendorId ? { _id: id, vendorId } : { _id: id };
  await Driver.deleteOne(filter);
  return { ok: true };
};

export const assignDriverToBooking = async ({ bookingId, driverId, vendorId = null, userId = null }) => {
  const bookingFilter = vendorId ? { _id: bookingId, vendorId } : { _id: bookingId };
  const booking = await Booking.findOne(bookingFilter);
  if (!booking) throw new ApiError(404, 'Booking not found');
  const driver = await Driver.findOne(vendorId ? { _id: driverId, vendorId: booking.vendorId } : { _id: driverId });
  if (!driver) throw new ApiError(404, 'Driver not found');
  if (driver.status === 'suspended' || driver.status === 'inactive') {
    throw new ApiError(400, 'Driver is not available');
  }
  booking.driver = {
    name: driver.name,
    phone: driver.phone,
    license: driver.licenseNumber || '',
  };
  if (driver.assignedBusId) booking.assignedBusId = driver.assignedBusId;
  await booking.save();
  driver.status = 'on_trip';
  driver.tripCount = (driver.tripCount || 0) + 1;
  await driver.save();
  await appendBookingEvent({
    bookingId: booking._id,
    type: 'driver',
    message: `Driver assigned: ${driver.name} (${driver.phone})`,
    meta: { driverId: String(driver._id) },
    createdBy: userId,
  });
  await rebuildBookingSearchText(booking._id);

  const customer = await User.findById(booking.customerId).lean();
  if (customer) {
    await notifyChannels({
      userId: customer._id,
      email: customer.email,
      phone: customer.phone,
      subject: 'Driver assigned for your trip',
      body: `${driver.name} (${driver.phone}) has been assigned to booking ${String(booking._id).slice(-8)}.`,
      channels: ['email', 'inapp'],
      type: 'booking',
      href: '/customer/bookings',
    });
  }
  return { ok: true, driver: { id: String(driver._id), name: driver.name, phone: driver.phone } };
};

export const getFleetAvailability = async (vendorId, query = {}) => {
  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to ? new Date(query.to) : new Date(Date.now() + 14 * 86400000);
  const buses = await Bus.find(vendorId ? { vendorId } : {}).lean();
  const bookings = await Booking.find({
    ...(vendorId ? { vendorId } : {}),
    rawStatus: { $in: ['confirmed', 'on_trip', 'pending_payment'] },
    createdAt: { $lte: to },
  })
    .populate('leadId')
    .lean();

  const events = [];
  for (const b of bookings) {
    const date = b.leadId?.journeyDate ? new Date(b.leadId.journeyDate) : b.createdAt;
    if (date < from || date > to) continue;
    events.push({
      id: String(b._id),
      title: `${b.leadId?.pickup || ''} → ${b.leadId?.drop || ''}`,
      date: b.leadId?.journeyDate || dayIso(date),
      status: b.rawStatus,
      busId: b.assignedBusId ? String(b.assignedBusId) : null,
      driver: b.driver?.name || '',
    });
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    buses: buses.map((b) => ({
      id: String(b._id),
      name: b.name || b.registrationNumber,
      registrationNumber: b.registrationNumber,
      type: b.type,
      approvalStatus: b.approvalStatus || 'approved',
      availabilityCalendar: b.availabilityCalendar || {},
    })),
    events,
  };
};

const dayIso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const scheduleTrip = async ({ bookingId, journeyDate, journeyTime, assignedBusId, vendorId, userId }) => {
  const booking = await Booking.findOne(vendorId ? { _id: bookingId, vendorId } : { _id: bookingId });
  if (!booking) throw new ApiError(404, 'Booking not found');
  const lead = await (await import('../models/Lead.js')).Lead.findById(booking.leadId);
  if (!lead) throw new ApiError(404, 'Lead not found');
  if (journeyDate) lead.journeyDate = journeyDate;
  if (journeyTime) lead.journeyTime = journeyTime;
  await lead.save();
  if (assignedBusId) {
    booking.assignedBusId = assignedBusId;
    await booking.save();
  }
  await appendBookingEvent({
    bookingId: booking._id,
    type: 'assignment',
    message: `Trip scheduled for ${lead.journeyDate} ${lead.journeyTime || ''}`,
    meta: { journeyDate: lead.journeyDate, journeyTime: lead.journeyTime, assignedBusId },
    createdBy: userId,
  });
  return { ok: true };
};
