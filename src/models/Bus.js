import mongoose from 'mongoose';

const daySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    available: { type: Boolean, default: true },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    busType: { type: String, required: true, trim: true },
    vehicleTypeSlug: { type: String, default: '', trim: true, lowercase: true, index: true },
    seats: { type: Number, required: true },
    ac: { type: Boolean, default: false },
    fuelType: {
      type: String,
      enum: ['diesel', 'petrol', 'cng', 'electric', 'hybrid', ''],
      default: 'diesel',
    },
    transmission: {
      type: String,
      enum: ['manual', 'automatic', ''],
      default: 'manual',
    },
    amenities: { type: [String], default: [] },
    pricingPerKm: { type: Number, default: 0 },
    pricingPerDay: { type: Number, default: 0 },
    availability: { type: String, default: 'available' },
    availabilityCalendar: { type: [daySchema], default: [] },
    images: { type: [mediaSchema], default: [] },
    imagePublicId: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvalRemark: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Bus = mongoose.model('Bus', schema);
