import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  vendorRegisterSchema,
  googleSchema,
  googleVendorRegisterSchema,
  googleAdminRegisterSchema,
  otpSendSchema,
  otpVerifySchema,
} from '../validators/auth.validators.js';
import { b2bRegisterSchema } from '../validators/b2b.validators.js';
const router = Router();
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/b2b/register', validate(b2bRegisterSchema), AuthController.b2bRegister);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/otp/send', validate(otpSendSchema), AuthController.sendOtp);
router.post('/otp/verify', validate(otpVerifySchema), AuthController.verifyOtp);
router.post('/vendor/register', validate(vendorRegisterSchema), AuthController.vendorRegister);
router.post('/google', validate(googleSchema), AuthController.google);
router.post('/google/vendor/register', validate(googleVendorRegisterSchema), AuthController.googleVendorRegister);
router.post('/google/admin/register', validate(googleAdminRegisterSchema), AuthController.googleAdminRegister);
router.get('/me', requireAuth, AuthController.me);
export default router;
