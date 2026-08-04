import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email'], required: true, default: 'email' },
    target: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: ['vendor_register', 'login', 'verify'],
      default: 'vendor_register',
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', schema);
