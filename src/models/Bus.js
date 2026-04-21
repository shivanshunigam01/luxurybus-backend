import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  registrationNumber: { type: String, required: true, trim: true },
  busType: { type: String, required: true, trim: true },
  seats: { type: Number, required: true },
  ac: { type: Boolean, default: false },
  pricingPerKm: { type: Number, default: 0 },
  pricingPerDay: { type: Number, default: 0 },
  availability: { type: String, default: 'available' },
  imagePublicId: { type: String, default: '' },
  imageUrl: { type: String, default: '' }
}, { timestamps: true });
export const Bus = mongoose.model('Bus', schema);
