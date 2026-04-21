import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  amount: { type: Number, required: true },
  inclusions: { type: String, default: '' },
  terms: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn'], default: 'pending' },
  responseMinutes: { type: Number, default: 0 }
}, { timestamps: true });
export const Quote = mongoose.model('Quote', schema);
