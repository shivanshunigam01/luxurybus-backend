import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: '', lowercase: true },
    licenseNumber: { type: String, default: '', trim: true },
    licenseExpiry: { type: Date, default: null },
    experienceYears: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'on_trip', 'suspended'], default: 'active', index: true },
    assignedBusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    ratingAvg: { type: Number, default: 0 },
    tripCount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

schema.index({ vendorId: 1, phone: 1 }, { unique: true });

export const Driver = mongoose.model('Driver', schema);
