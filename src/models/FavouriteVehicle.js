import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'B2BCompany', default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    vehicleTypeSlug: { type: String, default: '', index: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    label: { type: String, default: '' },
  },
  { timestamps: true },
);

export const FavouriteVehicle = mongoose.model('FavouriteVehicle', schema);
