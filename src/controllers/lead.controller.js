import { asyncHandler } from '../utils/asyncHandler.js';
import * as LeadService from '../services/lead.service.js';
export const createLead = asyncHandler(async (req, res) => res.status(201).json(await LeadService.createLead(req.validated.body, req.user || null)));
