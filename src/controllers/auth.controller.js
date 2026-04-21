import { asyncHandler } from '../utils/asyncHandler.js';
import * as AuthService from '../services/auth.service.js';
export const register = asyncHandler(async (req, res) => res.status(201).json(await AuthService.registerCustomer(req.validated.body)));
export const login = asyncHandler(async (req, res) => res.json(await AuthService.loginUser(req.validated.body)));
export const vendorRegister = asyncHandler(async (req, res) => res.status(201).json(await AuthService.registerVendor(req.validated.body)));
export const google = asyncHandler(async (req, res) => res.json(await AuthService.googleLogin(req.validated.body)));
export const googleVendorRegister = asyncHandler(async (req, res) => res.status(201).json(await AuthService.googleRegisterVendor(req.validated.body)));
export const googleAdminRegister = asyncHandler(async (req, res) => res.status(201).json(await AuthService.googleRegisterAdmin(req.validated.body)));
export const me = asyncHandler(async (req, res) => res.json(await AuthService.getCurrentUser(req.user.sub)));
