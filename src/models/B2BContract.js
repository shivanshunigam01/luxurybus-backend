import mongoose from 'mongoose';

const pricingRuleSchema = new mongoose.Schema(
  {
    vehicleTypeSlug: { type: String, required: true },
    ratePerKm: { type: Number, default: 0 },
    ratePerDay: { type: Number, default: 0 },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCompany', required: true, index: true },
    title: { type: String, required: true, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    pricingRules: { type: [pricingRuleSchema], default: [] },
    discountPercent: { type: Number, default: 0 },
    paymentTermsDays: { type: Number, default: 30 },
    status: { type: String, enum: ['draft', 'active', 'expired', 'cancelled'], default: 'draft', index: true },
    documentUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const B2BContract = mongoose.model('B2BContract', schema);
