import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, required: true, trim: true },
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  fleetSize: { type: Number, default: 0 },
  operatingCities: { type: String, default: '' },
  bankHolder: { type: String, default: '' },
  bankAccount: { type: String, default: '' },
  bankIfsc: { type: String, default: '' },
  bankName: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'active', 'blocked', 'rejected'], default: 'pending' },
  rating: { type: Number, default: 0 },
  city: { type: String, default: '' },
  logoPublicId: { type: String, default: '' },
  logoUrl: { type: String, default: '' }
}, { timestamps: true });
export const Vendor = mongoose.model('Vendor', schema);
