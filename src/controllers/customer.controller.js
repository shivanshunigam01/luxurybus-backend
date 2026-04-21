import { asyncHandler } from '../utils/asyncHandler.js';
import * as CustomerService from '../services/customer.service.js';
export const getDashboardStats = asyncHandler(async (req, res) => res.json(await CustomerService.getDashboardStats(req.user.sub)));
export const getBookings = asyncHandler(async (req, res) => res.json(await CustomerService.getBookings(req.user.sub)));
export const cancelBooking = asyncHandler(async (req, res) => res.json(await CustomerService.cancelBooking(req.params.id, req.user.sub)));
export const payAdvance = asyncHandler(async (_req, res) => res.json({ ok: true, message: 'Use Razorpay order flow for payments' }));
export const payBalance = asyncHandler(async (_req, res) => res.json({ ok: true, message: 'Use Razorpay order flow for payments' }));
export const payFull = asyncHandler(async (_req, res) => res.json({ ok: true, message: 'Use Razorpay order flow for payments' }));
export const getQuotes = asyncHandler(async (req, res) => res.json(await CustomerService.getQuotes(req.user.sub)));
export const acceptQuote = asyncHandler(async (req, res) =>
  res.json(await CustomerService.acceptQuote(req.validated.params.id, req.user.sub, req.validated.body)),
);
export const declineQuote = asyncHandler(async (req, res) => res.json(await CustomerService.declineQuote(req.params.id, req.user.sub)));
export const getReviews = asyncHandler(async (req, res) => res.json(await CustomerService.getReviews(req.user.sub)));
export const createReview = asyncHandler(async (req, res) => res.status(201).json(await CustomerService.createReview(req.validated.body, req.user.sub)));
export const updateProfile = asyncHandler(async (req, res) => res.json(await CustomerService.updateProfile(req.user.sub, req.body)));
