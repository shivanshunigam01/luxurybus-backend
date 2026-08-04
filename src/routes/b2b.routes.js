import { Router } from 'express';
import * as B2BController from '../controllers/b2b.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { acceptQuoteBodySchema, idParamSchema } from '../validators/common.validators.js';
import { employeeInviteSchema, employeeUpdateSchema, favouriteSchema } from '../validators/b2b.validators.js';

const router = Router();
router.use(requireAuth, requireRole('b2b'));

router.get('/dashboard', B2BController.dashboard);
router.get('/company', B2BController.company);
router.get('/employees', B2BController.employees);
router.post('/employees', validate(employeeInviteSchema), B2BController.inviteEmployee);
router.patch('/employees/:id', validate(employeeUpdateSchema), B2BController.updateEmployee);
router.get('/bookings', B2BController.bookings);
router.get('/trips', (req, res, next) => {
  req.query.trips = '1';
  return B2BController.bookings(req, res, next);
});
router.post('/quotes/:id/accept', validate(acceptQuoteBodySchema), B2BController.acceptQuote);
router.get('/favourites', B2BController.favourites);
router.post('/favourites', validate(favouriteSchema), B2BController.addFavourite);
router.delete('/favourites/:id', validate(idParamSchema), B2BController.removeFavourite);
router.get('/wallet', B2BController.wallet);
router.get('/payments', B2BController.wallet);
router.get('/contracts', B2BController.contracts);
router.get('/invoices', B2BController.invoices);
router.get('/invoices/:id', validate(idParamSchema), B2BController.invoice);

export default router;
