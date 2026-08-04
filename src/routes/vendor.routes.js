import { Router } from "express";
import * as VendorController from "../controllers/vendor.controller.js";
import * as PortalController from "../controllers/vendorPortal.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  idParamSchema,
  quoteCreateSchema,
  vendorBookingStatusSchema,
} from "../validators/common.validators.js";
import { upload } from "../middleware/upload.js";
const router = Router();
router.use(requireAuth, requireRole("vendor"));
router.get("/leads", VendorController.getLeads);
router.post(
  "/leads/:id/reject",
  validate(idParamSchema),
  VendorController.rejectLead,
);
router.get("/quotes", VendorController.getQuotes);
router.post(
  "/quotes",
  validate(quoteCreateSchema),
  VendorController.createQuote,
);
router.get("/dashboard-stats", VendorController.getDashboardStats);
router.get("/profile", PortalController.getPortalProfile);
router.patch("/profile", upload.single("logo"), VendorController.updateProfile);
router.patch("/onboarding/address", PortalController.updateAddress);
router.post(
  "/onboarding/documents/:docKey",
  upload.single("file"),
  PortalController.uploadDocument,
);
router.post("/onboarding/complete", PortalController.completeOnboarding);
router.get("/notifications", PortalController.notifications);
router.get("/analytics", PortalController.analytics);
router.get("/wallet", PortalController.wallet);
router.get("/payments", PortalController.wallet);
router.get("/buses", PortalController.listBuses);
router.post("/buses", upload.array("images", 8), PortalController.createBus);
router.patch("/buses/:id", upload.array("images", 8), PortalController.updateBus);
router.patch(
  "/buses/:id/calendar",
  validate(idParamSchema),
  PortalController.updateCalendar,
);
router.delete(
  "/buses/:id",
  validate(idParamSchema),
  VendorController.deleteBus,
);
router.get("/bookings", VendorController.getBookings);
router.patch(
  "/bookings/:id/status",
  validate(vendorBookingStatusSchema),
  VendorController.updateBookingStatus,
);
router.get("/earnings", VendorController.getEarnings);
router.get("/payouts", VendorController.listPayouts);
router.post("/payouts", VendorController.requestPayout);
export default router;
