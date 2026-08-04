import { z } from 'zod';
export const registerSchema = z.object({ body: z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().min(2), phone: z.string().optional() }), params: z.object({}).optional(), query: z.object({}).optional() });
export const loginSchema = z.object({ body: z.object({ email: z.string().email(), password: z.string().min(6) }), params: z.object({}).optional(), query: z.object({}).optional() });
export const otpSendSchema = z.object({
  body: z.object({
    channel: z.literal('email').default('email'),
    target: z.string().email(),
    purpose: z.enum(['vendor_register', 'login', 'verify']).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export const otpVerifySchema = z.object({
  body: z.object({
    channel: z.literal('email').default('email'),
    target: z.string().email(),
    code: z.string().min(4).max(8),
    purpose: z.enum(['vendor_register', 'login', 'verify']).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export const vendorRegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
    phone: z.string().min(10),
    companyName: z.string().min(2),
    businessType: z.string().optional(),
    ownerName: z.string().optional(),
    otpChannel: z.literal('email').optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    address: z.string().optional(),
    fleetSize: z.coerce.number().optional(),
    operatingCities: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pin: z.string().optional(),
    bankHolder: z.string().optional(),
    bankAccount: z.string().optional(),
    bankIfsc: z.string().optional(),
    bankName: z.string().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export const googleSchema = z.object({ body: z.object({ idToken: z.string().min(10) }), params: z.object({}).optional(), query: z.object({}).optional() });
export const googleVendorRegisterSchema = z.object({ body: z.object({ idToken: z.string().min(10), companyName: z.string().min(2), phone: z.string().optional(), operatingCities: z.string().optional(), city: z.string().optional() }), params: z.object({}).optional(), query: z.object({}).optional() });
export const googleAdminRegisterSchema = z.object({ body: z.object({ idToken: z.string().min(10) }), params: z.object({}).optional(), query: z.object({}).optional() });

