import { z } from 'zod';
export const idParamSchema = z.object({ body: z.object({}).passthrough().optional(), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const quoteCreateSchema = z.object({ body: z.object({ leadId: z.string().min(8), amount: z.coerce.number().positive(), inclusions: z.string().optional(), terms: z.string().optional() }), params: z.object({}).optional(), query: z.object({}).optional() });
export const reviewCreateSchema = z.object({
  body: z.object({
    bookingId: z.string().min(8).optional(),
    vendorId: z.string().min(8),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export const acceptQuoteBodySchema = z.object({
  body: z.object({ paymentType: z.enum(['advance', 'full']).optional(), policyAccepted: z.boolean() }),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});
const rawBookingStatus = z.enum(['pending_payment', 'confirmed', 'on_trip', 'completed', 'cancelled']);
export const vendorBookingStatusSchema = z.object({ body: z.object({ status: rawBookingStatus }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const adminBookingPatchSchema = z.object({ body: z.object({ status: rawBookingStatus }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const adminPayoutOverrideSchema = z.object({ body: z.object({ action: z.enum(['hold', 'release']) }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const adminVendorPatchSchema = z.object({ body: z.object({ status: z.enum(['pending', 'active', 'blocked', 'rejected']) }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const adminUserPatchSchema = z.object({ body: z.object({ blocked: z.boolean() }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
