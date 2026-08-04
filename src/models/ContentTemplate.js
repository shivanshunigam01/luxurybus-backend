import mongoose from 'mongoose';

const sectionDefSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    minWords: { type: Number, default: 0 },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
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
    sectionDefs: { type: [sectionDefSchema], default: [] },
    seoTitleTemplate: { type: String, default: '{Title} | Luxury Bus Rental' },
    seoDescriptionTemplate: { type: String, default: '{Description}' },
    keywordTemplates: { type: [String], default: [] },
    faqTemplates: {
      type: [{ question: String, answer: String }],
      default: [],
    },
    schemaTypes: { type: [String], default: ['Service', 'BreadcrumbList', 'FAQPage'] },
    uniqueBlockKeys: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true },
);

export const ContentTemplate = mongoose.model('ContentTemplate', schema);
