import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  { question: { type: String, required: true }, answer: { type: String, required: true } },
  { _id: false },
);
const linkSchema = new mongoose.Schema(
  { label: { type: String, required: true }, href: { type: String, required: true } },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    canonicalPath: { type: String, required: true, unique: true },
    intentSlug: { type: String, required: true, index: true },
    locationSlug: { type: String, required: true, index: true },
    intentType: { type: String, default: 'service' },
    locationType: { type: String, default: 'city' },
    servicePageSlug: { type: String, default: '' },
    vehicleTypeSlug: { type: String, default: '' },
    title: { type: String, default: '' },
    h1: { type: String, default: '' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogImage: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    body: { type: String, default: '' },
    faqs: { type: [faqSchema], default: [] },
    internalLinks: { type: [linkSchema], default: [] },
    relatedIntentSlugs: { type: [String], default: [] },
    nearbyCitySlugs: { type: [String], default: [] },
    nearbyAirportSlugs: { type: [String], default: [] },
    nearbyDestinationSlugs: { type: [String], default: [] },
    wordCount: { type: Number, default: 0 },
    contentHash: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'noindex', 'archived'],
      default: 'published',
      index: true,
    },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

schema.index({ intentSlug: 1, locationSlug: 1 }, { unique: true });
schema.index({ status: 1, updatedAt: -1 });

export const ProgrammaticSeoPage = mongoose.model('ProgrammaticSeoPage', schema);
