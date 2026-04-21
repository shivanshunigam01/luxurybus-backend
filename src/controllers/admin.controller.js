import { asyncHandler } from '../utils/asyncHandler.js';
import * as AdminService from '../services/admin.service.js';
export const getStats = asyncHandler(async (_req, res) => res.json(await AdminService.getStats()));
export const getBookings = asyncHandler(async (_req, res) => res.json(await AdminService.listBookings()));
export const updateBooking = asyncHandler(async (req, res) =>
  res.json(await AdminService.updateBooking(req.validated.params.id, req.validated.body)),
);
export const payoutOverride = asyncHandler(async (req, res) =>
  res.json(await AdminService.payoutOverride(req.validated.params.id, req.validated.body)),
);
export const getVendors = asyncHandler(async (_req, res) => res.json(await AdminService.listVendors()));
export const updateVendor = asyncHandler(async (req, res) =>
  res.json(await AdminService.updateVendor(req.validated.params.id, req.validated.body)),
);
export const getUsers = asyncHandler(async (_req, res) => res.json(await AdminService.listUsers()));
export const updateUser = asyncHandler(async (req, res) =>
  res.json(await AdminService.updateUser(req.validated.params.id, req.validated.body)),
);
export const getPayments = asyncHandler(async (_req, res) => res.json(await AdminService.listPayments()));
export const refundPayment = asyncHandler(async (req, res) => res.json(await AdminService.refundPayment(req.params.id)));
export const getCms = asyncHandler(async (_req, res) => res.json(await AdminService.listCms()));
export const createCms = asyncHandler(async (req, res) => res.status(201).json(await AdminService.createCms(req.body)));
export const updateCms = asyncHandler(async (req, res) => res.json(await AdminService.updateCms(req.params.id, req.body)));
export const deleteCms = asyncHandler(async (req, res) => res.json(await AdminService.deleteCms(req.params.id)));
export const getSettings = asyncHandler(async (_req, res) => res.json(await AdminService.getSettings()));
export const updateSettings = asyncHandler(async (req, res) => res.json(await AdminService.updateSettings(req.body)));
export const getNotificationLogs = asyncHandler(async (_req, res) => res.json(await AdminService.listNotificationLogs()));
export const sendNotification = asyncHandler(async (req, res) => res.status(201).json(await AdminService.sendNotification(req.body)));
export const getQuotes = asyncHandler(async (_req, res) => res.json(await AdminService.listQuotes()));
