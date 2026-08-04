import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  { question: { type: String, required: true }, answer: { type: String, required: true } },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: [
        'service',
        'industry',
        'city',
        'vehicle',
        'route',
        'destination',
        'airport',
        'corporate',
        'faq',
        'landing',
        'blog',
      ],
      required: true,
      index: true,
    },
    templateKey: { type: String, required: true, index: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    path: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    citySlug: { type: String, default: '', index: true },
    serviceSlug: { type: String, default: '' },
    industrySlug: { type: String, default: '' },
    vehicleSlug: { type: String, default: '' },
    fromLocationSlug: { type: String, default: '' },
    toLocationSlug: { type: String, default: '' },
    blocks: { type: mongoose.Schema.Types.Mixed, default: {} },
    blocksMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogImage: { type: String, default: '' },
    ogTitle: { type: String, default: '' },
    ogDescription: { type: String, default: '' },
    twitterTitle: { type: String, default: '' },
    twitterDescription: { type: String, default: '' },
    twitterImage: { type: String, default: '' },
    canonicalPath: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    seoLocked: { type: Boolean, default: false },
    faqs: { type: [faqSchema], default: [] },
    wordCount: { type: Number, default: 0 },
    contentHash: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'noindex', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ contentType: 1, slug: 1 }, { unique: true });
schema.index({ status: 1, contentType: 1 });

export const ContentPage = mongoose.model('ContentPage', schema);
