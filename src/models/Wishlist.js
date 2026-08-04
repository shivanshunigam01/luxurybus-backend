import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleTypeSlug: { type: String, default: '' },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    serviceSlug: { type: String, default: '' },
    label: { type: String, default: '' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

schema.index({ userId: 1, vehicleTypeSlug: 1, busId: 1, serviceSlug: 1 });

export const Wishlist = mongoose.model('Wishlist', schema);
