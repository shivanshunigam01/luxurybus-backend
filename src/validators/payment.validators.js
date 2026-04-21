import { z } from 'zod';
export const createOrderSchema = z.object({ body: z.object({ bookingId: z.string().min(8), purpose: z.enum(['advance', 'balance', 'full']) }), params: z.object({}).optional(), query: z.object({}).optional() });
export const verifyPaymentSchema = z.object({ body: z.object({ razorpay_order_id: z.string().min(4), razorpay_payment_id: z.string().min(4), razorpay_signature: z.string().min(4) }), params: z.object({}).optional(), query: z.object({}).optional() });
