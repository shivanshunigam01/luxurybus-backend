import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    role: { type: String, default: 'Editor' },
    social: {
      type: [{ platform: String, url: String }],
      default: [],
    },
    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const BlogAuthor = mongoose.model('BlogAuthor', schema);
