import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ['banner', 'coupon'], default: 'banner', index: true },
    code: { type: String, default: '', uppercase: true, trim: true },
    discountType: { type: String, enum: ['percent', 'flat', ''], default: '' },
    discountValue: { type: Number, default: 0 },
    description: { type: String, default: '' },
    banner: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      alt: { type: String, default: '' },
    },
    href: { type: String, default: '/book' },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    priority: { type: Number, default: 100 },
    status: { type: String, enum: ['draft', 'active', 'hidden', 'expired'], default: 'draft', index: true },
    target: { type: String, enum: ['all', 'b2b', 'customer'], default: 'all' },
    maxRedemptions: { type: Number, default: 0 },
    maxPerUser: { type: Number, default: 1 },
    minOrderAmount: { type: Number, default: 0 },
    redemptionCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Offer = mongoose.model('Offer', schema);
