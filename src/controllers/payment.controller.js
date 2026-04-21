import { asyncHandler } from '../utils/asyncHandler.js';
import * as PaymentService from '../services/payment.service.js';
export const createRazorpayOrder = asyncHandler(async (req, res) => res.json(await PaymentService.createRazorpayOrder({ ...req.validated.body, userId: req.user.sub })));
export const verifyRazorpayPayment = asyncHandler(async (req, res) =>
  res.json(await PaymentService.verifyRazorpayPayment(req.validated.body, req.user.sub)),
);
export const razorpayWebhook = asyncHandler(async (req, res) => res.json(await PaymentService.handleWebhook(req.body, req.headers['x-razorpay-signature'])));
