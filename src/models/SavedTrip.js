import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCompany', default: null },
    title: { type: String, default: '' },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    pickupLat: { type: Number, default: null },
    pickupLng: { type: Number, default: null },
    dropLat: { type: Number, default: null },
    dropLng: { type: Number, default: null },
    distanceKm: { type: Number, default: 0 },
    passengers: { type: Number, default: 1 },
    busType: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const SavedTrip = mongoose.model('SavedTrip', schema);
