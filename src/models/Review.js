import mongoose from 'mongoose';
const schema = new mongoose.Schema({ bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null }, customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true }, rating: { type: Number, min: 1, max: 5, required: true }, comment: { type: String, default: '' } }, { timestamps: true });
export const Review = mongoose.model('Review', schema);
