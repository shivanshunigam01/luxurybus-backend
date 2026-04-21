import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminBookingPatchSchema,
  adminPayoutOverrideSchema,
  adminUserPatchSchema,
  adminVendorPatchSchema,
  idParamSchema,
} from '../validators/common.validators.js';
const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/stats', AdminController.getStats);
router.get('/bookings', AdminController.getBookings);
router.patch('/bookings/:id', validate(adminBookingPatchSchema), AdminController.updateBooking);
router.post('/bookings/:id/payout-override', validate(adminPayoutOverrideSchema), AdminController.payoutOverride);
router.get('/vendors', AdminController.getVendors);
router.patch('/vendors/:id', validate(adminVendorPatchSchema), AdminController.updateVendor);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id', validate(adminUserPatchSchema), AdminController.updateUser);
router.get('/payments', AdminController.getPayments);
router.post('/payments/:id/refund', validate(idParamSchema), AdminController.refundPayment);
router.get('/cms', AdminController.getCms);
router.post('/cms', AdminController.createCms);
router.patch('/cms/:id', validate(idParamSchema), AdminController.updateCms);
router.delete('/cms/:id', validate(idParamSchema), AdminController.deleteCms);
router.get('/settings', AdminController.getSettings);
router.patch('/settings', AdminController.updateSettings);
router.get('/notification-logs', AdminController.getNotificationLogs);
router.post('/notifications', AdminController.sendNotification);
router.get('/quotes', AdminController.getQuotes);
export default router;
