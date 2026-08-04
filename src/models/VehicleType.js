import mongoose from 'mongoose';
import { VEHICLE_CATEGORIES } from '../constants/vehicleTypes.js';

const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: VEHICLE_CATEGORIES, default: 'bus', index: true },
    seatsMin: { type: Number, default: 0 },
    seatsMax: { type: Number, default: 0 },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 100 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const VehicleType = mongoose.model('VehicleType', schema);
