import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller.js';
import * as ContentController from '../controllers/content.controller.js';
import * as B2BController from '../controllers/b2b.controller.js';
import * as OfferController from '../controllers/offer.controller.js';
import * as PayoutController from '../controllers/payout.controller.js';
import * as Ent from '../controllers/enterprise.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import {
  adminBookingPatchSchema,
  adminPayoutOverrideSchema,
  adminUserPatchSchema,
  adminVendorPatchSchema,
  adminDocReviewSchema,
  adminFleetReviewSchema,
  adminWalletSchema,
  idParamSchema,
} from '../validators/common.validators.js';
import {
  companyStatusSchema,
  contractBodySchema,
  offerBodySchema,
  payoutProcessSchema,
} from '../validators/b2b.validators.js';
import {
  vehicleTypeBodySchema,
  vehicleTypeUpdateSchema,
  servicePageBodySchema,
  servicePageUpdateSchema,
  blogCategoryBodySchema,
  blogCategoryUpdateSchema,
  blogTagBodySchema,
  blogTagUpdateSchema,
  blogPostBodySchema,
  blogPostUpdateSchema,
  siteFaqBodySchema,
  siteFaqUpdateSchema,
} from '../validators/content.validators.js';
import * as SeoController from '../controllers/seo.controller.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/seo/site', SeoController.adminSiteGet);
router.patch('/seo/site', SeoController.adminSitePatch);
router.get('/seo/pages', SeoController.adminPageMetaList);
router.post('/seo/pages', SeoController.adminPageMetaUpsert);
router.delete('/seo/pages/:id', validate(idParamSchema), SeoController.adminPageMetaDelete);
router.get('/seo/redirects', SeoController.adminRedirectList);
router.post('/seo/redirects', SeoController.adminRedirectUpsert);
router.delete('/seo/redirects/:id', validate(idParamSchema), SeoController.adminRedirectDelete);
router.get('/seo/orphans', SeoController.adminOrphans);
router.get('/seo/locations', SeoController.adminLocations);
router.post('/seo/locations', SeoController.adminLocationUpsert);
router.get('/seo/intents', SeoController.adminIntents);
router.post('/seo/intents', SeoController.adminIntentUpsert);
router.get('/seo/programmatic', SeoController.adminProgrammaticList);
router.post('/seo/programmatic/generate', SeoController.adminGenerateProgrammatic);
router.get('/seo/templates', SeoController.adminTemplates);
router.post('/seo/templates', SeoController.adminTemplateUpsert);
router.get('/seo/content-pages', SeoController.adminContentPages);
router.post('/seo/content-pages', SeoController.adminContentUpsert);
router.get('/blog-authors', SeoController.adminAuthors);
router.post('/blog-authors', SeoController.adminAuthorUpsert);
router.post('/blogs/:id/rebuild-toc', validate(idParamSchema), SeoController.adminRebuildToc);

router.get('/stats', AdminController.getStats);
router.get('/analytics', Ent.adminAnalytics);
router.get('/search', Ent.globalSearch);
router.get('/audit-logs', Ent.auditLogs);
router.get('/activity', Ent.activityTimeline);
router.get('/drivers', Ent.listDriversAdmin);
router.get('/calendar', Ent.fleetCalendar);
router.get('/bookings', AdminController.getBookings);
router.get('/bookings/:id', validate(idParamSchema), AdminController.getBookingDetail);
router.patch('/bookings/:id', validate(adminBookingPatchSchema), AdminController.updateBooking);
router.post('/bookings/:id/payout-override', validate(adminPayoutOverrideSchema), AdminController.payoutOverride);

router.get('/b2b/companies', B2BController.adminCompanies);
router.get('/b2b/companies/:id', validate(idParamSchema), B2BController.adminCompany);
router.patch('/b2b/companies/:id', validate(companyStatusSchema), B2BController.adminCompanyStatus);
router.post('/b2b/companies/:companyId/contracts', validate(contractBodySchema), B2BController.adminCreateContract);
router.patch('/b2b/companies/:companyId/contracts/:id', B2BController.adminUpdateContract);
router.delete('/b2b/contracts/:id', validate(idParamSchema), B2BController.adminDeleteContract);
router.get('/b2b/invoices', B2BController.adminInvoices);
router.post('/b2b/invoices/:id/paid', validate(idParamSchema), B2BController.adminMarkInvoicePaid);
router.get('/b2b/gst-summary', B2BController.adminGstSummary);
router.get('/b2b/reports', B2BController.adminReport);

router.get('/offers', OfferController.adminList);
router.post('/offers', upload.single('banner'), validate(offerBodySchema), OfferController.adminCreate);
router.patch('/offers/:id', upload.single('banner'), OfferController.adminUpdate);
router.delete('/offers/:id', validate(idParamSchema), OfferController.adminDelete);

router.get('/payouts', PayoutController.adminList);
router.get('/payouts/export', PayoutController.adminExport);
router.post('/payouts/:id/process', validate(payoutProcessSchema), PayoutController.adminProcess);
router.get('/vendors', AdminController.getVendors);
router.get('/vendors/:id', validate(idParamSchema), AdminController.getVendorDetail);
router.patch('/vendors/:id', validate(adminVendorPatchSchema), AdminController.updateVendor);
router.post('/vendors/:id/remarks', validate(idParamSchema), AdminController.vendorRemark);
router.patch(
  '/vendors/:id/documents/:docKey',
  validate(adminDocReviewSchema),
  AdminController.reviewVendorDoc,
);
router.patch('/fleet/:id/review', validate(adminFleetReviewSchema), AdminController.reviewFleet);
router.post('/vendors/:id/wallet', validate(adminWalletSchema), AdminController.vendorWalletAdjust);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id', validate(adminUserPatchSchema), AdminController.updateUser);
router.get('/payments', AdminController.getPayments);
router.post('/payments/:id/refund', validate(idParamSchema), AdminController.refundPayment);

/* Legacy CMS stub — prefer /vehicle-types, /services, /blogs, /faqs */
router.get('/cms', AdminController.getCms);
router.post('/cms', AdminController.createCms);
router.patch('/cms/:id', validate(idParamSchema), AdminController.updateCms);
router.delete('/cms/:id', validate(idParamSchema), AdminController.deleteCms);

router.get('/vehicle-types', ContentController.adminListVehicleTypes);
router.post('/vehicle-types', upload.single('image'), validate(vehicleTypeBodySchema), ContentController.adminCreateVehicleType);
router.patch('/vehicle-types/:id', upload.single('image'), validate(vehicleTypeUpdateSchema), ContentController.adminUpdateVehicleType);
router.delete('/vehicle-types/:id', validate(idParamSchema), ContentController.adminDeleteVehicleType);

router.get('/services', ContentController.adminListServices);
router.post('/services', upload.single('banner'), validate(servicePageBodySchema), ContentController.adminCreateService);
router.patch('/services/:id', upload.single('banner'), validate(servicePageUpdateSchema), ContentController.adminUpdateService);
router.delete('/services/:id', validate(idParamSchema), ContentController.adminDeleteService);

router.get('/blog-categories', ContentController.adminListBlogCategories);
router.post('/blog-categories', validate(blogCategoryBodySchema), ContentController.adminCreateBlogCategory);
router.patch('/blog-categories/:id', validate(blogCategoryUpdateSchema), ContentController.adminUpdateBlogCategory);
router.delete('/blog-categories/:id', validate(idParamSchema), ContentController.adminDeleteBlogCategory);

router.get('/blog-tags', ContentController.adminListBlogTags);
router.post('/blog-tags', validate(blogTagBodySchema), ContentController.adminCreateBlogTag);
router.patch('/blog-tags/:id', validate(blogTagUpdateSchema), ContentController.adminUpdateBlogTag);
router.delete('/blog-tags/:id', validate(idParamSchema), ContentController.adminDeleteBlogTag);

router.get('/blogs', ContentController.adminListBlogPosts);
router.post('/blogs', upload.single('featuredImage'), validate(blogPostBodySchema), ContentController.adminCreateBlogPost);
router.patch('/blogs/:id', upload.single('featuredImage'), validate(blogPostUpdateSchema), ContentController.adminUpdateBlogPost);
router.delete('/blogs/:id', validate(idParamSchema), ContentController.adminDeleteBlogPost);

router.get('/faqs', ContentController.adminListFaqs);
router.post('/faqs', validate(siteFaqBodySchema), ContentController.adminCreateFaq);
router.patch('/faqs/:id', validate(siteFaqUpdateSchema), ContentController.adminUpdateFaq);
router.delete('/faqs/:id', validate(idParamSchema), ContentController.adminDeleteFaq);

router.get('/settings', AdminController.getSettings);
router.patch('/settings', AdminController.updateSettings);
router.get('/notification-logs', AdminController.getNotificationLogs);
router.post('/notifications', AdminController.sendNotification);
router.get('/quotes', AdminController.getQuotes);
export default router;
