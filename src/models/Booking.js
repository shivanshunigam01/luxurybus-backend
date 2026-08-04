import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    license: { type: String, default: '' },
  },
  { _id: false },
);

const schema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCompany', default: null, index: true },
  assignedBusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
  driver: { type: driverSchema, default: () => ({}) },
  searchText: { type: String, default: '', index: true },
  couponCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  totalWithGst: { type: Number, required: true },
  paymentType: { type: String, enum: ['advance', 'full'], default: 'advance' },
  advanceRequired: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  rawStatus: { type: String, enum: ['pending_payment', 'confirmed', 'on_trip', 'completed', 'cancelled'], default: 'pending_payment' },
  displayStatus: { type: String, default: 'Pending Payment' },
  payoutOverride: { type: Boolean, default: false },
  payoutStatus: { type: String, enum: ['pending', 'ready', 'paid', 'held', 'refunded'], default: 'pending' },
  commissionDeducted: { type: Number, default: 0 },
  payoutAmount: { type: Number, default: 0 }
}, { timestamps: true });
export const Booking = mongoose.model('Booking', schema);
