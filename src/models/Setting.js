import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Luxury Bus Rental' },
    about: { type: String, default: '' },
    operatingLocations: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    gstEnabled: { type: Boolean, default: true },
    gstPercentage: { type: Number, default: 18 },
    vendorCommissionPercentage: { type: Number, default: 10 },
    quoteWindowHours: { type: Number, default: 24 },
    payoutMode: { type: String, enum: ['manual', 'automatic'], default: 'automatic' },
    payoutTrigger: { type: String, default: 'completion' },
  },
  { timestamps: true },
);

export const Setting = mongoose.model('Setting', schema);

