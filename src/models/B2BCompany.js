import mongoose from 'mongoose';

const remarkSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String, default: 'Admin' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const schema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    gstin: { type: String, default: '', trim: true, uppercase: true },
    pan: { type: String, default: '', trim: true, uppercase: true },
    businessType: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pin: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true },
    employeeCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected'],
      default: 'pending',
      index: true,
    },
    walletBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    defaultDiscountPercent: { type: Number, default: 0 },
    primaryUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    remarks: { type: [remarkSchema], default: [] },
  },
  { timestamps: true },
);

export const B2BCompany = mongoose.model('B2BCompany', schema);
