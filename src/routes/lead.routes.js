import { Router } from 'express';
import * as LeadController from '../controllers/lead.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createLeadSchema } from '../validators/lead.validators.js';
const router = Router();
router.post('/', optionalAuth, validate(createLeadSchema), LeadController.createLead);
export default router;
