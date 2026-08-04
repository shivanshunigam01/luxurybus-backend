import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    path: { type: String, required: true, unique: true, trim: true, index: true },
    slug: { type: String, default: '' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    canonicalPath: { type: String, default: '' },
    ogTitle: { type: String, default: '' },
    ogDescription: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    twitterTitle: { type: String, default: '' },
    twitterDescription: { type: String, default: '' },
    twitterImage: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    schemaOverrides: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: { type: Number, default: 0.7, min: 0, max: 1 },
    changefreq: {
      type: String,
      enum: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
      default: 'weekly',
    },
    indexStatus: { type: String, enum: ['index', 'noindex', 'blocked'], default: 'index', index: true },
    status: { type: String, enum: ['active', 'draft'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const SeoPageMeta = mongoose.model('SeoPageMeta', schema);
