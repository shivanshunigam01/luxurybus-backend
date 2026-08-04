import { Offer } from '../models/Offer.js';
import { ApiError } from '../utils/ApiError.js';

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const isWithinSchedule = (o, now = new Date()) => {
  if (o.startsAt && new Date(o.startsAt) > now) return false;
  if (o.expiresAt && new Date(o.expiresAt) < now) return false;
  return true;
};

export const publicListOffers = async (query = {}) => {
  const target = query.target || 'all';
  const filter = { status: 'active' };
  if (query.type) filter.type = query.type;
  const rows = await Offer.find(filter).sort({ priority: 1, createdAt: -1 }).lean();
  const now = new Date();
  return {
    offers: rows
      .filter((o) => isWithinSchedule(o, now))
      .filter((o) => o.target === 'all' || o.target === target || target === 'all')
      .map((o) => ({
        id: String(o._id),
        title: o.title,
        slug: o.slug,
        type: o.type,
        code: o.code,
        discountType: o.discountType,
        discountValue: o.discountValue,
        description: o.description,
        banner: o.banner,
        href: o.href,
        startsAt: o.startsAt,
        expiresAt: o.expiresAt,
        priority: o.priority,
        target: o.target,
      })),
  };
};

export const validateCoupon = async (code, { target = 'all', amount = 0, userId = null } = {}) => {
  if (!code) throw new ApiError(400, 'Coupon code required');
  const offer = await Offer.findOne({
    type: 'coupon',
    code: String(code).toUpperCase().trim(),
    status: 'active',
  });
  if (!offer) throw new ApiError(404, 'Invalid coupon');
  if (!isWithinSchedule(offer)) throw new ApiError(400, 'Coupon expired or not yet active');
  if (offer.target !== 'all' && target !== 'all' && offer.target !== target) {
    throw new ApiError(400, 'Coupon not valid for this account type');
  }
  if (offer.minOrderAmount && Number(amount) < Number(offer.minOrderAmount)) {
    throw new ApiError(400, `Minimum order amount is ₹${offer.minOrderAmount}`);
  }
  if (offer.maxRedemptions > 0 && offer.redemptionCount >= offer.maxRedemptions) {
    throw new ApiError(400, 'Coupon redemption limit reached');
  }
  if (userId && offer.maxPerUser > 0) {
    const { CouponRedemption } = await import('../models/CouponRedemption.js');
    const used = await CouponRedemption.countDocuments({ offerId: offer._id, userId });
    if (used >= offer.maxPerUser) throw new ApiError(400, 'You have already used this coupon');
  }
  let discountAmount = 0;
  if (offer.discountType === 'percent') {
    discountAmount = Math.round((Number(amount) * Number(offer.discountValue)) / 100);
  } else if (offer.discountType === 'flat') {
    discountAmount = Math.min(Number(amount), Number(offer.discountValue));
  }
  return {
    ok: true,
    offerId: String(offer._id),
    code: offer.code,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    discountAmount,
    title: offer.title,
  };
};

export const redeemCoupon = async ({ code, userId, bookingId, discountAmount }) => {
  const offer = await Offer.findOne({ type: 'coupon', code: String(code).toUpperCase().trim() });
  if (!offer) return null;
  const { CouponRedemption } = await import('../models/CouponRedemption.js');
  await CouponRedemption.create({
    offerId: offer._id,
    code: offer.code,
    userId: userId || null,
    bookingId: bookingId || null,
    discountAmount: Number(discountAmount || 0),
  });
  offer.redemptionCount = (offer.redemptionCount || 0) + 1;
  await offer.save();
  return { ok: true };
};

export const adminListOffers = async () => {
  const rows = await Offer.find().sort({ priority: 1, createdAt: -1 }).lean();
  return {
    offers: rows.map((o) => ({
      id: String(o._id),
      title: o.title,
      slug: o.slug,
      type: o.type,
      code: o.code,
      discountType: o.discountType,
      discountValue: o.discountValue,
      description: o.description,
      banner: o.banner,
      href: o.href,
      startsAt: o.startsAt,
      expiresAt: o.expiresAt,
      priority: o.priority,
      status: o.status,
      target: o.target,
    })),
  };
};

export const adminCreateOffer = async (body, fileMeta = null) => {
  const slug = body.slug || slugify(body.title);
  if (await Offer.findOne({ slug })) throw new ApiError(409, 'Slug already exists');
  const offer = await Offer.create({
    title: body.title,
    slug,
    type: body.type || 'banner',
    code: body.code ? String(body.code).toUpperCase() : '',
    discountType: body.discountType || '',
    discountValue: Number(body.discountValue || 0),
    description: body.description || '',
    banner: fileMeta
      ? { url: fileMeta.url, publicId: fileMeta.publicId || '', alt: body.title }
      : { url: body.bannerUrl || '', publicId: '', alt: body.title },
    href: body.href || '/book',
    startsAt: body.startsAt || null,
    expiresAt: body.expiresAt || null,
    priority: Number(body.priority ?? 100),
    status: body.status || 'draft',
    target: body.target || 'all',
  });
  return { ok: true, id: String(offer._id) };
};

export const adminUpdateOffer = async (id, body, fileMeta = null) => {
  const offer = await Offer.findById(id);
  if (!offer) throw new ApiError(404, 'Offer not found');
  const fields = [
    'title',
    'type',
    'discountType',
    'description',
    'href',
    'status',
    'target',
  ];
  for (const f of fields) {
    if (body[f] != null) offer[f] = body[f];
  }
  if (body.code != null) offer.code = String(body.code).toUpperCase();
  if (body.discountValue != null) offer.discountValue = Number(body.discountValue);
  if (body.priority != null) offer.priority = Number(body.priority);
  if (body.startsAt !== undefined) offer.startsAt = body.startsAt || null;
  if (body.expiresAt !== undefined) offer.expiresAt = body.expiresAt || null;
  if (body.slug) offer.slug = slugify(body.slug);
  if (fileMeta?.url) {
    offer.banner = { url: fileMeta.url, publicId: fileMeta.publicId || '', alt: offer.title };
  } else if (body.bannerUrl != null) {
    offer.banner.url = body.bannerUrl;
  }
  await offer.save();
  return { ok: true };
};

export const adminDeleteOffer = async (id) => {
  await Offer.deleteOne({ _id: id });
  return { ok: true };
};
