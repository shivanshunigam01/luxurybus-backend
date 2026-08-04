import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['customer', 'vendor', 'admin', 'b2b'], default: 'customer' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCompany', default: null },
  googleId: { type: String, sparse: true, index: true },
  blocked: { type: Boolean, default: false }
}, { timestamps: true });
export const User = mongoose.model('User', schema);
