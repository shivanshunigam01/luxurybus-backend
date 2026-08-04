import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    category: {
      type: String,
      enum: ['service', 'corporate', 'industry'],
      required: true,
      index: true,
    },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    banner: { type: mediaSchema, default: () => ({}) },
    gallery: { type: [mediaSchema], default: [] },
    vehicleTypeSlugs: { type: [String], default: [] },
    citySlugs: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    whyChooseUs: { type: [String], default: [] },
    faqs: { type: [faqSchema], default: [] },
    cta: {
      label: { type: String, default: 'Get a Free Quote' },
      href: { type: String, default: '/book' },
    },
    internalLinks: { type: [linkSchema], default: [] },
    hero: {
      eyebrow: { type: String, default: '' },
      headline: { type: String, default: '' },
      subheadline: { type: String, default: '' },
      image: { type: mediaSchema, default: () => ({}) },
      primaryCta: { label: { type: String, default: 'Get a Free Quote' }, href: { type: String, default: '/book' } },
      secondaryCta: { label: { type: String, default: 'Contact Us' }, href: { type: String, default: '/contact' } },
    },
    overview: { type: String, default: '' },
    benefitItems: { type: [{ title: String, body: String }], default: [] },
    industries: { type: [{ name: String, body: String, href: String }], default: [] },
    features: { type: [{ title: String, body: String }], default: [] },
    bookingProcess: { type: [{ step: Number, title: String, body: String }], default: [] },
    testimonials: {
      type: [{ name: String, role: String, company: String, quote: String, rating: { type: Number, default: 5 } }],
      default: [],
    },
    mapEmbed: {
      lat: Number,
      lng: Number,
      label: String,
      embedUrl: { type: String, default: '' },
    },
    sectionsExtra: { type: [{ heading: String, body: String }], default: [] },
    wordCount: { type: Number, default: 0 },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    canonicalPath: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    status: {
      type: String,
      enum: ['draft', 'published', 'hidden'],
      default: 'draft',
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 100 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ category: 1, status: 1, sortOrder: 1 });

export const ServicePage = mongoose.model('ServicePage', schema);
