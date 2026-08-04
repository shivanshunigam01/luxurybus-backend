import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    type: {
      type: String,
      enum: ['status', 'payment', 'trip', 'note', 'driver', 'assignment'],
      required: true,
    },
    message: { type: String, required: true },
    meta: { type: Object, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const BookingEvent = mongoose.model('BookingEvent', schema);
