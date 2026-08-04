import { Router } from 'express';
import * as Ent from '../controllers/enterprise.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.validators.js';
import { z } from 'zod';

const fareSchema = z.object({
  body: z.object({
    origin: z.string().min(2),
    destination: z.string().min(2),
    busType: z.string().optional(),
    days: z.coerce.number().optional(),
    passengers: z.coerce.number().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const router = Router();

router.get('/maps/geocode', Ent.geocode);
router.get('/maps/distance', Ent.routeDistance);
router.post('/maps/distance', Ent.routeDistance);
router.post('/maps/fare-estimate', validate(fareSchema), Ent.estimateFare);

router.use(requireAuth);

router.get('/notifications', Ent.myNotifications);
router.post('/notifications/read-all', Ent.readAllNotifications);
router.post('/notifications/:id/read', validate(idParamSchema), Ent.readNotification);

router.get('/wishlist', requireRole('customer', 'b2b'), Ent.wishlist);
router.post('/wishlist', requireRole('customer', 'b2b'), Ent.addWishlist);
router.delete('/wishlist/:id', requireRole('customer', 'b2b'), validate(idParamSchema), Ent.removeWishlist);
router.get('/saved-trips', requireRole('customer', 'b2b'), Ent.savedTrips);
router.post('/saved-trips', requireRole('customer', 'b2b'), Ent.saveTrip);
router.delete('/saved-trips/:id', requireRole('customer', 'b2b'), validate(idParamSchema), Ent.deleteSavedTrip);

router.get('/invoices/:id/pdf', Ent.invoicePdf);
router.get('/vouchers/:id/pdf', Ent.tripVoucherPdf);

router.get('/search', requireRole('admin'), Ent.globalSearch);
router.get('/analytics', requireRole('admin'), Ent.adminAnalytics);
router.get('/audit-logs', requireRole('admin'), Ent.auditLogs);
router.get('/activity', requireRole('admin'), Ent.activityTimeline);

router.get('/drivers', requireRole('admin'), Ent.listDriversAdmin);
router.get('/calendar', requireRole('admin'), Ent.fleetCalendar);

export default router;

export const vendorEnterpriseRouter = (() => {
  const r = Router();
  r.use(requireAuth, requireRole('vendor'));
  r.get('/analytics/deep', Ent.vendorAnalyticsDeep);
  r.get('/drivers', Ent.listDriversVendor);
  r.post('/drivers', Ent.createDriver);
  r.patch('/drivers/:id', Ent.updateDriver);
  r.delete('/drivers/:id', Ent.deleteDriver);
  r.post('/bookings/:id/assign-driver', Ent.assignDriver);
  r.post('/bookings/:id/schedule', Ent.scheduleTrip);
  r.get('/calendar', Ent.fleetCalendar);
  r.get('/vouchers/:id/pdf', Ent.tripVoucherPdf);
  return r;
})();

export const adminEnterpriseExtras = (() => {
  const r = Router();
  r.post('/bookings/:id/assign-driver', requireAuth, requireRole('admin'), Ent.assignDriver);
  r.post('/bookings/:id/schedule', requireAuth, requireRole('admin'), Ent.scheduleTrip);
  r.post('/drivers', requireAuth, requireRole('admin'), Ent.createDriver);
  r.patch('/drivers/:id', requireAuth, requireRole('admin'), Ent.updateDriver);
  r.delete('/drivers/:id', requireAuth, requireRole('admin'), Ent.deleteDriver);
  r.get('/invoices/:id/pdf', requireAuth, requireRole('admin'), Ent.invoicePdf);
  return r;
})();
