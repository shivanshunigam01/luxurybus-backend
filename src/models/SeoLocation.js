import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  { question: { type: String, required: true }, answer: { type: String, required: true } },
  { _id: false },
);
const routeSchema = new mongoose.Schema(
  { fromLabel: String, toLabel: String, href: String, notes: { type: String, default: '' } },
  { _id: false },
);
const namedBlurbSchema = new mongoose.Schema(
  { name: String, blurb: { type: String, default: '' }, href: { type: String, default: '' } },
  { _id: false },
);
const testimonialSchema = new mongoose.Schema(
  { name: String, role: String, company: String, quote: String, rating: { type: Number, default: 5 } },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['city', 'airport', 'destination', 'state', 'country'],
      default: 'city',
      index: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    stateName: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    country: { type: String, default: 'India' },
    tier: { type: Number, enum: [1, 2, 3], default: 2, index: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    description: { type: String, default: '' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogImage: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    canonicalPath: { type: String, default: '' },
    popularRoutes: { type: [routeSchema], default: [] },
    popularIndustries: { type: [namedBlurbSchema], default: [] },
    nearbyAirportSlugs: { type: [String], default: [] },
    touristPlaces: { type: [namedBlurbSchema], default: [] },
    corporateHubs: { type: [namedBlurbSchema], default: [] },
    metroNotes: { type: String, default: '' },
    vehicleAvailabilitySlugs: { type: [String], default: [] },
    pricingHints: {
      currency: { type: String, default: 'INR' },
      notes: { type: String, default: '' },
      seaterBands: { type: [String], default: [] },
    },
    faqs: { type: [faqSchema], default: [] },
    testimonials: { type: [testimonialSchema], default: [] },
    relatedServiceSlugs: { type: [String], default: [] },
    nearbyCitySlugs: { type: [String], default: [] },
    nearbyDestinationSlugs: { type: [String], default: [] },
    mapEmbed: {
      lat: Number,
      lng: Number,
      label: String,
      embedUrl: { type: String, default: '' },
    },
    wordCount: { type: Number, default: 0 },
    contentHash: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'noindex', 'archived'],
      default: 'published',
      index: true,
    },
  },
  { timestamps: true },
);

schema.index({ type: 1, status: 1, tier: 1 });
schema.index({ stateName: 1, name: 1 });

export const SeoLocation = mongoose.model('SeoLocation', schema);
