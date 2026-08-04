import { asyncHandler } from '../utils/asyncHandler.js';
import * as OfferService from '../services/offer.service.js';
import { uploadBufferToCloudinary } from '../integrations/cloudinary.js';

const fileMeta = async (file) => {
  if (!file) return null;
  const up = await uploadBufferToCloudinary(file.buffer, 'offers');
  return { url: up.secure_url || up.url, publicId: up.public_id };
};

export const publicOffers = asyncHandler(async (req, res) =>
  res.json(await OfferService.publicListOffers(req.query)),
);
export const validateCoupon = asyncHandler(async (req, res) =>
  res.json(await OfferService.validateCoupon(req.body.code, req.body)),
);
export const adminList = asyncHandler(async (_req, res) => res.json(await OfferService.adminListOffers()));
export const adminCreate = asyncHandler(async (req, res) => {
  const meta = await fileMeta(req.file);
  res.status(201).json(await OfferService.adminCreateOffer(req.validated?.body || req.body, meta));
});
export const adminUpdate = asyncHandler(async (req, res) => {
  const meta = await fileMeta(req.file);
  res.json(await OfferService.adminUpdateOffer(req.params.id, req.validated?.body || req.body, meta));
});
export const adminDelete = asyncHandler(async (req, res) =>
  res.json(await OfferService.adminDeleteOffer(req.params.id)),
);
