import mongoose from 'mongoose';

const docSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    fileName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['missing', 'pending', 'approved', 'rejected'],
      default: 'missing',
    },
    remark: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    uploadedAt: { type: Date, default: null },
  },
  { _id: false },
);

const remarkSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String, default: 'Admin' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const emptyDoc = () => ({
  url: '',
  publicId: '',
  fileName: '',
  status: 'missing',
  remark: '',
  reviewedAt: null,
  uploadedAt: null,
});

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    ownerName: { type: String, default: '' },
    businessType: {
      type: String,
      enum: [
        '',
        'sole_proprietor',
        'partnership',
        'private_limited',
        'llp',
        'public_limited',
        'opc',
        'other',
      ],
      default: '',
    },
    gstNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pin: { type: String, default: '' },
    fleetSize: { type: Number, default: 0 },
    operatingCities: { type: String, default: '' },
    bankHolder: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    bankIfsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'active', 'blocked', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    registrationStep: { type: Number, default: 1 },
    documentsStatus: {
      type: String,
      enum: ['incomplete', 'pending_review', 'approved', 'rejected'],
      default: 'incomplete',
    },
    documents: {
      aadhar: { type: docSchema, default: emptyDoc },
      pan: { type: docSchema, default: emptyDoc },
      gst: { type: docSchema, default: emptyDoc },
      drivingLicense: { type: docSchema, default: emptyDoc },
      rc: { type: docSchema, default: emptyDoc },
      insurance: { type: docSchema, default: emptyDoc },
      businessProof: { type: docSchema, default: emptyDoc },
      cancelledCheque: { type: docSchema, default: emptyDoc },
      vehicleImages: { type: [docSchema], default: [] },
    },
    walletBalance: { type: Number, default: 0 },
    remarks: { type: [remarkSchema], default: [] },
    rating: { type: Number, default: 0 },
    logoPublicId: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    verifiedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Vendor = mongoose.model('Vendor', schema);
