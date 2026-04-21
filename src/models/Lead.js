import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: { type: String, default: '' },
  guestEmail: { type: String, default: '' },
  guestPhone: { type: String, default: '' },
  pickup: { type: String, required: true },
  drop: { type: String, required: true },
  journeyDate: { type: String, required: true },
  journeyTime: { type: String, required: true },
  returnDate: { type: String, default: '' },
  passengers: { type: Number, required: true },
  busType: { type: String, default: '' },
  acPreference: { type: String, default: '' },
  purpose: { type: String, default: '' },
  notes: { type: String, default: '' },
  acceptedQuoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', default: null },
  rejectedByVendorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }]
}, { timestamps: true });
export const Lead = mongoose.model('Lead', schema);
