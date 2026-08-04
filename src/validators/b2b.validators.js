import { z } from 'zod';

const empty = { params: z.object({}).optional(), query: z.object({}).optional() };

export const b2bRegisterSchema = z.object({
  body: z.object({
    companyName: z.string().min(2),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    businessType: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pin: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email().optional(),
    employeeCount: z.coerce.number().optional(),
    contactName: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email(),
    phone: z.string().min(10),
    password: z.string().min(6),
  }).refine((b) => Boolean(b.contactName || b.name), { message: 'Contact name required', path: ['contactName'] }),
  ...empty,
});

export const employeeInviteSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    department: z.string().optional(),
    password: z.string().min(6).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const employeeUpdateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const favouriteSchema = z.object({
  body: z.object({
    vehicleTypeSlug: z.string().optional(),
    busId: z.string().optional(),
    label: z.string().optional(),
  }),
  ...empty,
});

export const companyStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'active', 'suspended', 'rejected']).optional(),
    creditLimit: z.coerce.number().optional(),
    defaultDiscountPercent: z.coerce.number().optional(),
    walletBalance: z.coerce.number().optional(),
    rejectionReason: z.string().optional(),
    remark: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const contractBodySchema = z.object({
  body: z.object({
    title: z.string().min(2),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    pricingRules: z
      .array(
        z.object({
          vehicleTypeSlug: z.string(),
          ratePerKm: z.coerce.number().optional(),
          ratePerDay: z.coerce.number().optional(),
        }),
      )
      .optional(),
    discountPercent: z.coerce.number().optional(),
    paymentTermsDays: z.coerce.number().optional(),
    status: z.enum(['draft', 'active', 'expired', 'cancelled']).optional(),
    documentUrl: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ companyId: z.string().min(1), id: z.string().optional() }),
  query: z.object({}).optional(),
});

export const offerBodySchema = z.object({
  body: z.object({
    title: z.string().min(2),
    slug: z.string().optional(),
    type: z.enum(['banner', 'coupon']).optional(),
    code: z.string().optional(),
    discountType: z.enum(['percent', 'flat', '']).optional(),
    discountValue: z.coerce.number().optional(),
    description: z.string().optional(),
    bannerUrl: z.string().optional(),
    href: z.string().optional(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    priority: z.coerce.number().optional(),
    status: z.enum(['draft', 'active', 'hidden', 'expired']).optional(),
    target: z.enum(['all', 'b2b', 'customer']).optional(),
  }),
  params: z.object({ id: z.string().optional() }),
  query: z.object({}).optional(),
});

export const payoutProcessSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject', 'partial', 'paid', 'approved', 'rejected']).optional(),
    status: z.string().optional(),
    amountApproved: z.coerce.number().optional(),
    remarks: z.string().optional(),
    transactionId: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const couponValidateSchema = z.object({
  body: z.object({
    code: z.string().min(2),
    target: z.enum(['all', 'b2b', 'customer']).optional(),
    amount: z.coerce.number().optional(),
  }),
  ...empty,
});
