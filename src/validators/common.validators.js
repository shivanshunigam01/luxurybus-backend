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
  body: z.object({
    paymentType: z.enum(['advance', 'full']).optional(),
    policyAccepted: z.boolean(),
    couponCode: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});
const rawBookingStatus = z.enum(['pending_payment', 'confirmed', 'on_trip', 'completed', 'cancelled']);
export const vendorBookingStatusSchema = z.object({ body: z.object({ status: rawBookingStatus }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const adminBookingPatchSchema = z.object({
  body: z.object({
    status: rawBookingStatus.optional(),
    assignedBusId: z.string().min(8).optional(),
    driver: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        license: z.string().optional(),
      })
      .optional(),
  }),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});
export const adminPayoutOverrideSchema = z.object({ body: z.object({ action: z.enum(['hold', 'release']) }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
export const adminVendorPatchSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'active', 'blocked', 'rejected', 'suspended']).optional(),
    remark: z.string().optional(),
    rejectionReason: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});
export const adminDocReviewSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected', 'pending']),
    remark: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(8), docKey: z.string().min(2) }),
  query: z.object({}).optional(),
});
export const adminFleetReviewSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected', 'pending']),
    remark: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});
export const adminWalletSchema = z.object({
  body: z.object({
    type: z.enum(['credit', 'debit', 'payout', 'adjustment']),
    amount: z.coerce.number().positive(),
    note: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});

export const adminUserPatchSchema = z.object({ body: z.object({ blocked: z.boolean() }), params: z.object({ id: z.string().min(8) }), query: z.object({}).optional() });
