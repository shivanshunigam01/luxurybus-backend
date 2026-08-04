import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    fromPath: { type: String, required: true, unique: true, trim: true, index: true },
    toPath: { type: String, required: true, trim: true },
    statusCode: { type: Number, enum: [301, 302, 410], default: 301 },
    enabled: { type: Boolean, default: true, index: true },
    hits: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const SeoRedirect = mongoose.model('SeoRedirect', schema);
