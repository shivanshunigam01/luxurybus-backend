import mongoose from 'mongoose';

const faqTplSchema = new mongoose.Schema(
  { question: { type: String, required: true }, answer: { type: String, required: true } },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    intentType: {
      type: String,
      enum: ['service', 'vehicle', 'industry', 'airport', 'destination', 'corporate', 'generic'],
      default: 'service',
      index: true,
    },
    servicePageSlug: { type: String, default: '' },
    vehicleTypeSlug: { type: String, default: '' },
    h1Template: { type: String, default: '{Intent} in {City}' },
    titleTemplate: { type: String, default: '{Intent} in {City} | Luxury Bus Rental' },
    descriptionTemplate: {
      type: String,
      default: 'Book {Intent} in {City}, {State}. Luxury coaches, Urbania, Tempo Traveller & corporate fleet from Luxury Bus Rental India.',
    },
    keywordTemplates: { type: [String], default: [] },
    bodyTemplate: { type: String, default: '' },
    faqTemplates: { type: [faqTplSchema], default: [] },
    schemaType: { type: String, default: 'Service' },
    allowedLocationTypes: { type: [String], default: ['city'] },
    minTier: { type: Number, default: 2 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const SeoIntent = mongoose.model('SeoIntent', schema);
