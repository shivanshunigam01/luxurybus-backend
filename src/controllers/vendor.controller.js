import { asyncHandler } from '../utils/asyncHandler.js';
import * as VendorService from '../services/vendor.service.js';
export const getLeads = asyncHandler(async (req, res) => res.json(await VendorService.getVendorLeads(req.user.vendorId)));
export const rejectLead = asyncHandler(async (req, res) => res.json(await VendorService.rejectLead(req.params.id, req.user.vendorId)));
export const getQuotes = asyncHandler(async (req, res) => res.json(await VendorService.getVendorQuotes(req.user.vendorId)));
export const createQuote = asyncHandler(async (req, res) => res.status(201).json(await VendorService.createQuote(req.validated.body, req.user.vendorId)));
export const getDashboardStats = asyncHandler(async (req, res) => res.json(await VendorService.getDashboardStats(req.user.vendorId)));
export const getProfile = asyncHandler(async (req, res) => res.json(await VendorService.getProfile(req.user.vendorId)));
export const updateProfile = asyncHandler(async (req, res) => res.json(await VendorService.updateProfile(req.user.vendorId, req.body, req.file)));
export const getBuses = asyncHandler(async (req, res) => res.json(await VendorService.listBuses(req.user.vendorId)));
export const createBus = asyncHandler(async (req, res) => res.status(201).json(await VendorService.createBus(req.user.vendorId, req.body, req.file)));
export const updateBus = asyncHandler(async (req, res) => res.json(await VendorService.updateBus(req.params.id, req.user.vendorId, req.body, req.file)));
export const deleteBus = asyncHandler(async (req, res) => res.json(await VendorService.deleteBus(req.params.id, req.user.vendorId)));
export const getBookings = asyncHandler(async (req, res) => res.json(await VendorService.getBookings(req.user.vendorId)));
export const updateBookingStatus = asyncHandler(async (req, res) =>
  res.json(await VendorService.updateBookingStatus(req.params.id, req.user.vendorId, req.validated.body.status)),
);
export const getEarnings = asyncHandler(async (req, res) => res.json(await VendorService.getEarnings(req.user.vendorId)));
