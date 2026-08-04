import { asyncHandler } from '../utils/asyncHandler.js';
import * as Portal from '../services/vendorPortal.service.js';
import * as VendorService from '../services/vendor.service.js';

export const getPortalProfile = asyncHandler(async (req, res) =>
  res.json(await Portal.getVendorPortalProfile(req.user.vendorId)),
);

export const updateAddress = asyncHandler(async (req, res) =>
  res.json(await Portal.updateOnboardingAddress(req.user.vendorId, req.body)),
);

export const uploadDocument = asyncHandler(async (req, res) =>
  res.json(await Portal.uploadVendorDocument(req.user.vendorId, req.params.docKey, req.file)),
);

export const completeOnboarding = asyncHandler(async (req, res) =>
  res.json(await Portal.completeOnboarding(req.user.vendorId)),
);

export const notifications = asyncHandler(async (req, res) =>
  res.json(await Portal.listVendorNotifications(req.user.vendorId)),
);

export const analytics = asyncHandler(async (req, res) =>
  res.json(await Portal.getVendorAnalytics(req.user.vendorId)),
);

export const wallet = asyncHandler(async (req, res) =>
  res.json(await Portal.getVendorWallet(req.user.vendorId)),
);

export const createBus = asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  res.status(201).json(await Portal.createVendorBus(req.user.vendorId, req.body, files));
});

export const updateBus = asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  res.json(await Portal.updateVendorBus(req.params.id, req.user.vendorId, req.body, files));
});

export const updateCalendar = asyncHandler(async (req, res) =>
  res.json(await Portal.updateBusCalendar(req.params.id, req.user.vendorId, req.body.days || req.body)),
);

export const listBuses = asyncHandler(async (req, res) => {
  const buses = await VendorService.listBuses(req.user.vendorId);
  res.json({ buses });
});
