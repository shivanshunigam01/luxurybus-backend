import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    group: { type: String, enum: ['home', 'general'], default: 'general', index: true },
    sortOrder: { type: Number, default: 100 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const SiteFaq = mongoose.model('SiteFaq', schema);
