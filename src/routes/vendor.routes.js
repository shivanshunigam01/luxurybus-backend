import { Router } from "express";
import * as VendorController from "../controllers/vendor.controller.js";
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
router.get("/profile", VendorController.getProfile);
router.patch("/profile", upload.single("logo"), VendorController.updateProfile);
router.get("/buses", VendorController.getBuses);
router.post("/buses", upload.single("image"), VendorController.createBus);
router.patch("/buses/:id", upload.single("image"), VendorController.updateBus);
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
export default router;
