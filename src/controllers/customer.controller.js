import { asyncHandler } from '../utils/asyncHandler.js';
import * as CustomerService from '../services/customer.service.js';
import * as Pdf from '../services/pdf.service.js';
import { Booking } from '../models/Booking.js';
import { Invoice } from '../models/Invoice.js';
import { ApiError } from '../utils/ApiError.js';

export const getDashboardStats = asyncHandler(async (req, res) => res.json(await CustomerService.getDashboardStats(req.user.sub)));
export const getBookings = asyncHandler(async (req, res) => res.json(await CustomerService.getBookings(req.user.sub)));
export const cancelBooking = asyncHandler(async (req, res) => res.json(await CustomerService.cancelBooking(req.params.id, req.user.sub)));
export const payAdvance = asyncHandler(async (req, res) =>
  res.json(await CustomerService.recordBookingPayment(req.params.id, req.user.sub, 'advance')),
);
export const payBalance = asyncHandler(async (req, res) =>
  res.json(await CustomerService.recordBookingPayment(req.params.id, req.user.sub, 'balance')),
);
export const payFull = asyncHandler(async (req, res) =>
  res.json(await CustomerService.recordBookingPayment(req.params.id, req.user.sub, 'full')),
);

export const customerTripVoucherPdf = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).lean();
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (String(booking.customerId) !== String(req.user.sub)) throw new ApiError(403, 'Access denied');
  const { buffer, filename } = await Pdf.buildTripVoucherPdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export const customerInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).lean();
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  if (String(invoice.customerId) !== String(req.user.sub)) throw new ApiError(403, 'Access denied');
  const { buffer, filename } = await Pdf.buildGstInvoicePdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});
export const getQuotes = asyncHandler(async (req, res) => res.json(await CustomerService.getQuotes(req.user.sub)));
export const acceptQuote = asyncHandler(async (req, res) =>
  res.json(await CustomerService.acceptQuote(req.validated.params.id, req.user.sub, req.validated.body)),
);
export const declineQuote = asyncHandler(async (req, res) => res.json(await CustomerService.declineQuote(req.params.id, req.user.sub)));
export const getReviews = asyncHandler(async (req, res) => res.json(await CustomerService.getReviews(req.user.sub)));
export const createReview = asyncHandler(async (req, res) => res.status(201).json(await CustomerService.createReview(req.validated.body, req.user.sub)));
export const updateProfile = asyncHandler(async (req, res) => res.json(await CustomerService.updateProfile(req.user.sub, req.body)));
