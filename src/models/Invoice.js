import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCompany', default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    lineItems: { type: [lineSchema], default: [] },
    taxable: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    gstinBuyer: { type: String, default: '' },
    gstinSeller: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'issued', 'paid', 'cancelled'], default: 'issued', index: true },
    pdfMeta: { type: Object, default: {} },
    issuedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Invoice = mongoose.model('Invoice', schema);
