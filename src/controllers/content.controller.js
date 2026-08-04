import { asyncHandler } from '../utils/asyncHandler.js';
import * as ContentService from '../services/content.service.js';

/* Public */
export const publicVehicleTypes = asyncHandler(async (req, res) =>
  res.json({ items: await ContentService.listVehicleTypesPublic(req.query) }),
);
export const publicServices = asyncHandler(async (req, res) =>
  res.json({ items: await ContentService.listServicePagesPublic(req.query) }),
);
export const publicServiceBySlug = asyncHandler(async (req, res) =>
  res.json(await ContentService.getServicePageBySlug(req.params.slug)),
);
export const publicBlogs = asyncHandler(async (req, res) =>
  res.json(await ContentService.listBlogPostsPublic(req.query)),
);
export const publicBlogBySlug = asyncHandler(async (req, res) =>
  res.json(await ContentService.getBlogPostBySlug(req.params.slug)),
);
export const publicBlogCategories = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listBlogCategories({ publicOnly: true }) }),
);
export const publicBlogTags = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listBlogTags({ publicOnly: true }) }),
);
export const publicFaqs = asyncHandler(async (req, res) =>
  res.json({ items: await ContentService.listFaqsPublic(req.query) }),
);
export const publicReviews = asyncHandler(async (req, res) =>
  res.json({ items: await ContentService.listFeaturedReviews(req.query.limit) }),
);
export const publicSitemap = asyncHandler(async (_req, res) =>
  res.json(await ContentService.getSitemapUrls()),
);
export const publicFleet = asyncHandler(async (req, res) =>
  res.json({ items: await ContentService.listPublicFleet(req.query) }),
);

/* Admin Vehicle Types */
export const adminListVehicleTypes = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listVehicleTypesAdmin() }),
);
export const adminCreateVehicleType = asyncHandler(async (req, res) =>
  res.status(201).json(await ContentService.createVehicleType(req.validated?.body || req.body, req.file)),
);
export const adminUpdateVehicleType = asyncHandler(async (req, res) =>
  res.json(
    await ContentService.updateVehicleType(req.params.id, req.validated?.body || req.body, req.file),
  ),
);
export const adminDeleteVehicleType = asyncHandler(async (req, res) =>
  res.json(await ContentService.deleteVehicleType(req.params.id)),
);

/* Admin Service Pages */
export const adminListServices = asyncHandler(async (req, res) =>
  res.json({ items: await ContentService.listServicePagesAdmin(req.query) }),
);
export const adminCreateService = asyncHandler(async (req, res) =>
  res.status(201).json(await ContentService.createServicePage(req.validated?.body || req.body, req.file)),
);
export const adminUpdateService = asyncHandler(async (req, res) =>
  res.json(
    await ContentService.updateServicePage(req.params.id, req.validated?.body || req.body, req.file),
  ),
);
export const adminDeleteService = asyncHandler(async (req, res) =>
  res.json(await ContentService.deleteServicePage(req.params.id)),
);

/* Admin Blog */
export const adminListBlogCategories = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listBlogCategories() }),
);
export const adminCreateBlogCategory = asyncHandler(async (req, res) =>
  res.status(201).json(await ContentService.createBlogCategory(req.validated?.body || req.body)),
);
export const adminUpdateBlogCategory = asyncHandler(async (req, res) =>
  res.json(await ContentService.updateBlogCategory(req.params.id, req.validated?.body || req.body)),
);
export const adminDeleteBlogCategory = asyncHandler(async (req, res) =>
  res.json(await ContentService.deleteBlogCategory(req.params.id)),
);

export const adminListBlogTags = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listBlogTags() }),
);
export const adminCreateBlogTag = asyncHandler(async (req, res) =>
  res.status(201).json(await ContentService.createBlogTag(req.validated?.body || req.body)),
);
export const adminUpdateBlogTag = asyncHandler(async (req, res) =>
  res.json(await ContentService.updateBlogTag(req.params.id, req.validated?.body || req.body)),
);
export const adminDeleteBlogTag = asyncHandler(async (req, res) =>
  res.json(await ContentService.deleteBlogTag(req.params.id)),
);

export const adminListBlogPosts = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listBlogPostsAdmin() }),
);
export const adminCreateBlogPost = asyncHandler(async (req, res) =>
  res.status(201).json(await ContentService.createBlogPost(req.validated?.body || req.body, req.file)),
);
export const adminUpdateBlogPost = asyncHandler(async (req, res) =>
  res.json(await ContentService.updateBlogPost(req.params.id, req.validated?.body || req.body, req.file)),
);
export const adminDeleteBlogPost = asyncHandler(async (req, res) =>
  res.json(await ContentService.deleteBlogPost(req.params.id)),
);

/* Admin FAQs */
export const adminListFaqs = asyncHandler(async (_req, res) =>
  res.json({ items: await ContentService.listFaqsAdmin() }),
);
export const adminCreateFaq = asyncHandler(async (req, res) =>
  res.status(201).json(await ContentService.createFaq(req.validated?.body || req.body)),
);
export const adminUpdateFaq = asyncHandler(async (req, res) =>
  res.json(await ContentService.updateFaq(req.params.id, req.validated?.body || req.body)),
);
export const adminDeleteFaq = asyncHandler(async (req, res) =>
  res.json(await ContentService.deleteFaq(req.params.id)),
);
