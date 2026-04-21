import mongoose from 'mongoose';
const schema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, title: { type: String, required: true }, content: { type: String, default: '' }, status: { type: String, enum: ['draft', 'published'], default: 'published' } }, { timestamps: true });
export const Cms = mongoose.model('Cms', schema);
