import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true, index: true },
    code: { type: String, required: true, uppercase: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    discountAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CouponRedemption = mongoose.model('CouponRedemption', schema);
