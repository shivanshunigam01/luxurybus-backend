import { VehicleType } from '../models/VehicleType.js';
import { ServicePage } from '../models/ServicePage.js';
import { BlogPost } from '../models/BlogPost.js';
import { BlogCategory } from '../models/BlogCategory.js';
import { BlogTag } from '../models/BlogTag.js';
import { SiteFaq } from '../models/SiteFaq.js';
import { Review } from '../models/Review.js';
import { Bus } from '../models/Bus.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify, estimateReadTime } from '../utils/slugify.js';
import { uploadBufferToCloudinary, destroyFromCloudinary } from '../integrations/cloudinary.js';
import { VEHICLE_TYPE_SEED } from '../constants/vehicleTypes.js';

const parseMaybeJson = (value, fallback) => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeArray = (value) => {
  const parsed = parseMaybeJson(value, value);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.includes(',')) {
    return parsed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return parsed == null || parsed === '' ? [] : [parsed];
};

const categoryPath = (category, slug) => {
  if (category === 'corporate') return `/corporate/${slug}`;
  if (category === 'industry') return `/industries/${slug}`;
  return `/services/${slug}`;
};

const ensureUniqueSlug = async (Model, slug, excludeId) => {
  let base = slugify(slug);
  if (!base) base = 'item';
  let candidate = base;
  let i = 2;
  while (true) {
    const q = { slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Model.findOne(q).select('_id').lean();
    if (!exists) return candidate;
    candidate = `${base}-${i++}`;
  }
};

const applyPublishState = (payload) => {
  const data = { ...payload };
  if (data.status === 'published' && !data.publishedAt) {
    data.publishedAt = new Date();
  }
  if (data.status === 'scheduled' && data.scheduledAt) {
    data.scheduledAt = new Date(data.scheduledAt);
  }
  if (data.publishedAt) data.publishedAt = new Date(data.publishedAt);
  return data;
};

/* ---------------- Vehicle Types ---------------- */

export const listVehicleTypesAdmin = async () =>
  VehicleType.find().sort({ sortOrder: 1, name: 1 });

export const listVehicleTypesPublic = async (query = {}) => {
  const filter = { status: 'active' };
  if (query.category) filter.category = query.category;
  if (query.featured === 'true' || query.featured === true) filter.featured = true;
  return VehicleType.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
};

export const createVehicleType = async (payload, file) => {
  const data = { ...payload };
  data.slug = await ensureUniqueSlug(VehicleType, data.slug || data.name);
  if (file) {
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/vehicle-types');
    data.imagePublicId = up.public_id;
    data.imageUrl = up.secure_url;
  }
  return VehicleType.create(data);
};

export const updateVehicleType = async (id, payload, file) => {
  const row = await VehicleType.findById(id);
  if (!row) throw new ApiError(404, 'Vehicle type not found');
  const data = { ...payload };
  if (data.slug || data.name) {
    data.slug = await ensureUniqueSlug(VehicleType, data.slug || data.name || row.name, id);
  }
  Object.assign(row, data);
  if (file) {
    if (row.imagePublicId) await destroyFromCloudinary(row.imagePublicId).catch(() => null);
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/vehicle-types');
    row.imagePublicId = up.public_id;
    row.imageUrl = up.secure_url;
  }
  await row.save();
  return row;
};

export const deleteVehicleType = async (id) => {
  const row = await VehicleType.findById(id);
  if (!row) throw new ApiError(404, 'Vehicle type not found');
  if (row.imagePublicId) await destroyFromCloudinary(row.imagePublicId).catch(() => null);
  await row.deleteOne();
  return { ok: true };
};

export const resolveVehicleType = async (slugOrName) => {
  if (!slugOrName) return null;
  const slug = slugify(slugOrName);
  let vt = await VehicleType.findOne({
    $or: [{ slug }, { name: new RegExp(`^${slugOrName}$`, 'i') }],
  });
  if (vt) return vt;
  const seed = VEHICLE_TYPE_SEED.find(
    (v) => v.slug === slug || v.name.toLowerCase() === String(slugOrName).toLowerCase(),
  );
  if (seed) {
    vt = await VehicleType.findOneAndUpdate(
      { slug: seed.slug },
      { ...seed, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return vt;
};

export const normalizeBusPayload = async (payload) => {
  const data = { ...payload };
  if (typeof data.ac === 'string') data.ac = data.ac === 'true' || data.ac === '1';
  ['pricingPerKm', 'pricingPerDay', 'seats'].forEach((k) => {
    if (data[k] != null) data[k] = Number(data[k]);
  });
  const key = data.vehicleTypeSlug || data.busType;
  const vt = await resolveVehicleType(key);
  if (!vt) throw new ApiError(400, 'Invalid vehicle type. Choose a type from the catalog.');
  data.vehicleTypeSlug = vt.slug;
  data.busType = vt.name;
  return data;
};

/* ---------------- Service Pages ---------------- */

const parseServiceBody = (body = {}) => {
  const data = { ...body };
  ['gallery', 'vehicleTypeSlugs', 'citySlugs', 'benefits', 'whyChooseUs', 'faqs', 'internalLinks', 'keywords'].forEach(
    (k) => {
      if (data[k] != null) data[k] = normalizeArray(data[k]);
    },
  );
  if (data.banner && typeof data.banner === 'string') data.banner = parseMaybeJson(data.banner, {});
  if (data.cta && typeof data.cta === 'string') data.cta = parseMaybeJson(data.cta, {});
  if (data.featured != null) data.featured = data.featured === true || data.featured === 'true';
  return data;
};

export const listServicePagesAdmin = async (query = {}) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  return ServicePage.find(filter).sort({ sortOrder: 1, updatedAt: -1 });
};

export const listServicePagesPublic = async (query = {}) => {
  const filter = { status: 'published' };
  if (query.category) filter.category = query.category;
  if (query.featured === 'true' || query.featured === true) filter.featured = true;
  if (query.city) filter.citySlugs = query.city;
  if (query.vehicleType) filter.vehicleTypeSlugs = query.vehicleType;
  return ServicePage.find(filter).sort({ sortOrder: 1, publishedAt: -1 }).lean();
};

export const getServicePageBySlug = async (slug, { publicOnly = true } = {}) => {
  const filter = { slug: slugify(slug) };
  if (publicOnly) filter.status = 'published';
  const row = await ServicePage.findOne(filter).lean();
  if (!row) throw new ApiError(404, 'Service page not found');
  return row;
};

export const createServicePage = async (payload, file) => {
  const data = applyPublishState(parseServiceBody(payload));
  data.slug = await ensureUniqueSlug(ServicePage, data.slug || data.title);
  if (!data.canonicalPath) data.canonicalPath = categoryPath(data.category, data.slug);
  if (file) {
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/services');
    data.banner = { ...(data.banner || {}), url: up.secure_url, publicId: up.public_id };
  }
  return ServicePage.create(data);
};

export const updateServicePage = async (id, payload, file) => {
  const row = await ServicePage.findById(id);
  if (!row) throw new ApiError(404, 'Service page not found');
  const data = applyPublishState(parseServiceBody(payload));
  if (data.slug || data.title) {
    data.slug = await ensureUniqueSlug(ServicePage, data.slug || data.title || row.title, id);
  }
  if (data.category || data.slug) {
    const cat = data.category || row.category;
    const sl = data.slug || row.slug;
    if (!data.canonicalPath) data.canonicalPath = categoryPath(cat, sl);
  }
  Object.assign(row, data);
  if (file) {
    if (row.banner?.publicId) await destroyFromCloudinary(row.banner.publicId).catch(() => null);
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/services');
    row.banner = { ...(row.banner?.toObject?.() || row.banner || {}), url: up.secure_url, publicId: up.public_id };
  }
  await row.save();
  return row;
};

export const deleteServicePage = async (id) => {
  const row = await ServicePage.findById(id);
  if (!row) throw new ApiError(404, 'Service page not found');
  if (row.banner?.publicId) await destroyFromCloudinary(row.banner.publicId).catch(() => null);
  for (const g of row.gallery || []) {
    if (g.publicId) await destroyFromCloudinary(g.publicId).catch(() => null);
  }
  await row.deleteOne();
  return { ok: true };
};

/* ---------------- Blog ---------------- */

export const listBlogCategories = async ({ publicOnly = false } = {}) => {
  const filter = publicOnly ? { status: 'active' } : {};
  return BlogCategory.find(filter).sort({ name: 1 });
};

export const createBlogCategory = async (payload) => {
  const data = { ...payload };
  data.slug = await ensureUniqueSlug(BlogCategory, data.slug || data.name);
  return BlogCategory.create(data);
};

export const updateBlogCategory = async (id, payload) => {
  const row = await BlogCategory.findById(id);
  if (!row) throw new ApiError(404, 'Category not found');
  if (payload.slug || payload.name) {
    payload.slug = await ensureUniqueSlug(BlogCategory, payload.slug || payload.name || row.name, id);
  }
  Object.assign(row, payload);
  await row.save();
  return row;
};

export const deleteBlogCategory = async (id) => {
  const row = await BlogCategory.findById(id);
  if (!row) throw new ApiError(404, 'Category not found');
  await row.deleteOne();
  return { ok: true };
};

export const listBlogTags = async ({ publicOnly = false } = {}) => {
  const filter = publicOnly ? { status: 'active' } : {};
  return BlogTag.find(filter).sort({ name: 1 });
};

export const createBlogTag = async (payload) => {
  const data = { ...payload };
  data.slug = await ensureUniqueSlug(BlogTag, data.slug || data.name);
  return BlogTag.create(data);
};

export const updateBlogTag = async (id, payload) => {
  const row = await BlogTag.findById(id);
  if (!row) throw new ApiError(404, 'Tag not found');
  if (payload.slug || payload.name) {
    payload.slug = await ensureUniqueSlug(BlogTag, payload.slug || payload.name || row.name, id);
  }
  Object.assign(row, payload);
  await row.save();
  return row;
};

export const deleteBlogTag = async (id) => {
  const row = await BlogTag.findById(id);
  if (!row) throw new ApiError(404, 'Tag not found');
  await row.deleteOne();
  return { ok: true };
};

const parseBlogBody = (body = {}) => {
  const data = { ...body };
  ['categoryIds', 'tagIds', 'relatedPostIds', 'keywords', 'gallery'].forEach((k) => {
    if (data[k] != null) data[k] = normalizeArray(data[k]);
  });
  if (data.featuredImage && typeof data.featuredImage === 'string') {
    data.featuredImage = parseMaybeJson(data.featuredImage, {});
  }
  if (data.author && typeof data.author === 'string') data.author = parseMaybeJson(data.author, {});
  if (data.featured != null) data.featured = data.featured === true || data.featured === 'true';
  if (data.content && !data.readTimeMinutes) data.readTimeMinutes = estimateReadTime(data.content);
  return applyPublishState(data);
};

const publishScheduled = async () => {
  const now = new Date();
  await BlogPost.updateMany(
    { status: 'scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'published', publishedAt: now } },
  );
};

export const listBlogPostsAdmin = async () => {
  await publishScheduled();
  return BlogPost.find()
    .populate('categoryIds', 'name slug')
    .populate('tagIds', 'name slug')
    .sort({ updatedAt: -1 });
};

export const listBlogPostsPublic = async (query = {}) => {
  await publishScheduled();
  const filter = { status: 'published' };
  if (query.q) filter.$text = { $search: query.q };
  if (query.category) {
    const cat = await BlogCategory.findOne({ slug: query.category, status: 'active' }).select('_id');
    if (cat) filter.categoryIds = cat._id;
    else return { items: [], page: 1, total: 0, pages: 0 };
  }
  if (query.tag) {
    const tag = await BlogTag.findOne({ slug: query.tag, status: 'active' }).select('_id');
    if (tag) filter.tagIds = tag._id;
    else return { items: [], page: 1, total: 0, pages: 0 };
  }
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
  const total = await BlogPost.countDocuments(filter);
  const items = await BlogPost.find(filter)
    .populate('categoryIds', 'name slug')
    .populate('tagIds', 'name slug')
    .sort({ publishedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { items, page, total, pages: Math.ceil(total / limit) || 0 };
};

export const getBlogPostBySlug = async (slug) => {
  await publishScheduled();
  const post = await BlogPost.findOne({ slug: slugify(slug), status: 'published' })
    .populate('categoryIds', 'name slug')
    .populate('tagIds', 'name slug')
    .populate({
      path: 'relatedPostIds',
      select: 'title slug excerpt featuredImage publishedAt readTimeMinutes status',
      match: { status: 'published' },
    })
    .lean();
  if (!post) throw new ApiError(404, 'Blog post not found');

  let related = (post.relatedPostIds || []).filter(Boolean);
  if (related.length < 3) {
    const extras = await BlogPost.find({
      status: 'published',
      _id: { $ne: post._id, $nin: related.map((r) => r._id) },
      categoryIds: { $in: (post.categoryIds || []).map((c) => c._id || c) },
    })
      .select('title slug excerpt featuredImage publishedAt readTimeMinutes')
      .limit(3 - related.length)
      .lean();
    related = [...related, ...extras];
  }
  return { ...post, related };
};

export const createBlogPost = async (payload, file) => {
  const data = parseBlogBody(payload);
  data.slug = await ensureUniqueSlug(BlogPost, data.slug || data.title);
  if (!data.canonicalPath) data.canonicalPath = `/blog/${data.slug}`;
  if (file) {
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/blogs');
    data.featuredImage = {
      ...(data.featuredImage || {}),
      url: up.secure_url,
      publicId: up.public_id,
    };
  }
  return BlogPost.create(data);
};

export const updateBlogPost = async (id, payload, file) => {
  const row = await BlogPost.findById(id);
  if (!row) throw new ApiError(404, 'Blog post not found');
  const data = parseBlogBody(payload);
  if (data.slug || data.title) {
    data.slug = await ensureUniqueSlug(BlogPost, data.slug || data.title || row.title, id);
  }
  if (!data.canonicalPath && (data.slug || row.slug)) {
    data.canonicalPath = `/blog/${data.slug || row.slug}`;
  }
  Object.assign(row, data);
  if (file) {
    if (row.featuredImage?.publicId) {
      await destroyFromCloudinary(row.featuredImage.publicId).catch(() => null);
    }
    const up = await uploadBufferToCloudinary(file.buffer, 'luxurybus/blogs');
    row.featuredImage = {
      ...(row.featuredImage?.toObject?.() || row.featuredImage || {}),
      url: up.secure_url,
      publicId: up.public_id,
    };
  }
  await row.save();
  return row;
};

export const deleteBlogPost = async (id) => {
  const row = await BlogPost.findById(id);
  if (!row) throw new ApiError(404, 'Blog post not found');
  if (row.featuredImage?.publicId) {
    await destroyFromCloudinary(row.featuredImage.publicId).catch(() => null);
  }
  await row.deleteOne();
  return { ok: true };
};

/* ---------------- FAQs ---------------- */

export const listFaqsAdmin = async () => SiteFaq.find().sort({ group: 1, sortOrder: 1 });

export const listFaqsPublic = async (query = {}) => {
  const filter = { status: 'active' };
  if (query.group) filter.group = query.group;
  return SiteFaq.find(filter).sort({ sortOrder: 1 }).lean();
};

export const createFaq = async (payload) => SiteFaq.create(payload);
export const updateFaq = async (id, payload) => {
  const row = await SiteFaq.findById(id);
  if (!row) throw new ApiError(404, 'FAQ not found');
  Object.assign(row, payload);
  await row.save();
  return row;
};
export const deleteFaq = async (id) => {
  const row = await SiteFaq.findById(id);
  if (!row) throw new ApiError(404, 'FAQ not found');
  await row.deleteOne();
  return { ok: true };
};

/* ---------------- Reviews / Sitemap ---------------- */

export const listFeaturedReviews = async (limit = 8) => {
  const rows = await Review.find()
    .sort({ rating: -1, createdAt: -1 })
    .limit(Number(limit) || 8)
    .populate('customerId', 'name')
    .populate('vendorId', 'companyName')
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    customerName: r.customerId?.name || 'Customer',
    vendorName: r.vendorId?.companyName || '',
    createdAt: r.createdAt,
  }));
};

export const getSitemapUrls = async () => {
  await publishScheduled();
  const { expandSitemapUrls } = await import('./seo.service.js');
  return expandSitemapUrls();
};

export const listPublicFleet = async (query = {}) => {
  const filter = { availability: { $ne: 'unavailable' } };
  if (query.vehicleType) filter.vehicleTypeSlug = query.vehicleType;
  if (query.busType) filter.busType = new RegExp(query.busType, 'i');
  return Bus.find(filter)
    .select('busType vehicleTypeSlug seats ac pricingPerDay pricingPerKm imageUrl availability vendorId')
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Number(query.limit) || 40))
    .lean();
};
