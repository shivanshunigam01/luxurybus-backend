import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    amountRequested: { type: Number, required: true },
    amountApproved: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'partial', 'paid'],
      default: 'pending',
      index: true,
    },
    remarks: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    bankSnapshot: {
      bankHolder: { type: String, default: '' },
      bankAccount: { type: String, default: '' },
      bankIfsc: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const VendorPayout = mongoose.model('VendorPayout', schema);
