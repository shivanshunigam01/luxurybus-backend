import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    author: {
      name: { type: String, default: 'Kartar Travels' },
      avatarUrl: { type: String, default: '' },
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogAuthor', default: null },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory' }],
    tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogTag' }],
    featuredImage: { type: mediaSchema, default: () => ({}) },
    gallery: { type: [mediaSchema], default: [] },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    canonicalPath: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    readTimeMinutes: { type: Number, default: 5 },
    showToc: { type: Boolean, default: true },
    toc: {
      type: [{ id: String, text: String, level: Number }],
      default: [],
    },
    faqs: {
      type: [{ question: String, answer: String }],
      default: [],
    },
    viewCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'hidden'],
      default: 'draft',
      index: true,
    },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    relatedPostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' }],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ status: 1, publishedAt: -1 });
schema.index({ title: 'text', excerpt: 'text', content: 'text' });

export const BlogPost = mongoose.model('BlogPost', schema);
