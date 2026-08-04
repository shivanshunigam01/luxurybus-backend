import { asyncHandler } from '../utils/asyncHandler.js';
import * as Search from '../services/search.service.js';
import * as Analytics from '../services/analytics.service.js';
import * as Maps from '../services/maps.service.js';
import * as Audit from '../services/audit.service.js';
import * as Notify from '../services/notify.service.js';
import * as Pdf from '../services/pdf.service.js';
import * as Driver from '../services/driver.service.js';
import * as Wishlist from '../services/wishlist.service.js';
import { BookingEvent } from '../models/BookingEvent.js';
import { parsePagination, paginatedResult } from '../utils/pagination.js';

export const globalSearch = asyncHandler(async (req, res) =>
  res.json(await Search.globalSearch(req.query.q, { limit: Number(req.query.limit || 8) })),
);

export const adminAnalytics = asyncHandler(async (req, res) =>
  res.json(await Analytics.getAdminAnalytics(req.query)),
);

export const vendorAnalyticsDeep = asyncHandler(async (req, res) =>
  res.json(await Analytics.getVendorAnalyticsDeep(req.user.vendorId, req.query)),
);

export const geocode = asyncHandler(async (req, res) =>
  res.json(await Maps.geocodePlace(req.query.q || req.body?.q)),
);

export const routeDistance = asyncHandler(async (req, res) =>
  res.json(await Maps.routeDistance({ origin: req.body.origin || req.query.origin, destination: req.body.destination || req.query.destination })),
);

export const estimateFare = asyncHandler(async (req, res) =>
  res.json(
    await Maps.estimateFare({
      origin: req.body.origin,
      destination: req.body.destination,
      busType: req.body.busType,
      days: req.body.days,
      passengers: req.body.passengers,
    }),
  ),
);

export const auditLogs = asyncHandler(async (req, res) => res.json(await Audit.listAuditLogs(req.query)));

export const myNotifications = asyncHandler(async (req, res) =>
  res.json(await Notify.listUserNotifications(req.user.sub, { unreadOnly: req.query.unread === '1' })),
);

export const readNotification = asyncHandler(async (req, res) =>
  res.json(await Notify.markNotificationRead(req.user.sub, req.params.id)),
);

export const readAllNotifications = asyncHandler(async (req, res) =>
  res.json(await Notify.markAllNotificationsRead(req.user.sub)),
);

export const invoicePdf = asyncHandler(async (req, res) => {
  const { buffer, filename } = await Pdf.buildGstInvoicePdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export const tripVoucherPdf = asyncHandler(async (req, res) => {
  const { buffer, filename } = await Pdf.buildTripVoucherPdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export const activityTimeline = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 40 });
  const filter = {};
  if (req.query.bookingId) filter.bookingId = req.query.bookingId;
  if (req.query.type) filter.type = req.query.type;
  const [rows, total] = await Promise.all([
    BookingEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    BookingEvent.countDocuments(filter),
  ]);
  res.json(
    paginatedResult({
      items: rows.map((e) => ({
        id: String(e._id),
        bookingId: String(e.bookingId),
        type: e.type,
        message: e.message,
        meta: e.meta,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
    }),
  );
});

/* Drivers */
export const listDriversAdmin = asyncHandler(async (req, res) => res.json(await Driver.listDrivers(req.query.vendorId || null, req.query)));
export const listDriversVendor = asyncHandler(async (req, res) => res.json(await Driver.listDrivers(req.user.vendorId, req.query)));
export const createDriver = asyncHandler(async (req, res) =>
  res.status(201).json(await Driver.createDriver(req.user.vendorId || req.body.vendorId, req.body)),
);
export const updateDriver = asyncHandler(async (req, res) =>
  res.json(await Driver.updateDriver(req.params.id, req.user.role === 'admin' ? null : req.user.vendorId, req.body)),
);
export const deleteDriver = asyncHandler(async (req, res) =>
  res.json(await Driver.deleteDriver(req.params.id, req.user.role === 'admin' ? null : req.user.vendorId)),
);
export const assignDriver = asyncHandler(async (req, res) =>
  res.json(
    await Driver.assignDriverToBooking({
      bookingId: req.params.id,
      driverId: req.body.driverId,
      vendorId: req.user.role === 'admin' ? null : req.user.vendorId,
      userId: req.user.sub,
    }),
  ),
);
export const fleetCalendar = asyncHandler(async (req, res) =>
  res.json(await Driver.getFleetAvailability(req.user.role === 'admin' ? req.query.vendorId || null : req.user.vendorId, req.query)),
);
export const scheduleTrip = asyncHandler(async (req, res) =>
  res.json(
    await Driver.scheduleTrip({
      bookingId: req.params.id,
      journeyDate: req.body.journeyDate,
      journeyTime: req.body.journeyTime,
      assignedBusId: req.body.assignedBusId,
      vendorId: req.user.role === 'admin' ? null : req.user.vendorId,
      userId: req.user.sub,
    }),
  ),
);

/* Wishlist / saved trips */
export const wishlist = asyncHandler(async (req, res) => res.json(await Wishlist.listWishlist(req.user.sub)));
export const addWishlist = asyncHandler(async (req, res) =>
  res.status(201).json(await Wishlist.addWishlist(req.user.sub, req.body)),
);
export const removeWishlist = asyncHandler(async (req, res) =>
  res.json(await Wishlist.removeWishlist(req.user.sub, req.params.id)),
);
export const savedTrips = asyncHandler(async (req, res) => res.json(await Wishlist.listSavedTrips(req.user.sub)));
export const saveTrip = asyncHandler(async (req, res) =>
  res.status(201).json(await Wishlist.saveTrip(req.user.sub, req.body)),
);
export const deleteSavedTrip = asyncHandler(async (req, res) =>
  res.json(await Wishlist.deleteSavedTrip(req.user.sub, req.params.id)),
);
