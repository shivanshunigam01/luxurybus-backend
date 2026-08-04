import { Router } from 'express';
import * as ContentController from '../controllers/content.controller.js';
import * as OfferController from '../controllers/offer.controller.js';
import * as Ent from '../controllers/enterprise.controller.js';
import * as SeoController from '../controllers/seo.controller.js';
import { validate } from '../middleware/validate.js';
import { couponValidateSchema } from '../validators/b2b.validators.js';
import { z } from 'zod';

const router = Router();

router.get('/seo/site', SeoController.publicSite);
router.get('/seo/resolve', SeoController.publicResolve);
router.get('/seo/redirects', SeoController.publicRedirects);
router.get('/seo/redirect', SeoController.publicMatchRedirect);
router.get('/seo/robots.txt', SeoController.publicRobots);
router.get('/cities', SeoController.publicCities);
router.get('/cities/:slug', SeoController.publicCity);
router.get('/seo-pages/:slug', SeoController.publicProgrammatic);
router.get('/internal-links', SeoController.publicInternalLinks);
router.get('/nav-links', SeoController.publicNavLinks);
router.get('/content/by-path', SeoController.publicContentByPath);
router.get('/content/:type/:slug', SeoController.publicContentByTypeSlug);

router.get('/offers', OfferController.publicOffers);
router.post('/offers/validate-coupon', validate(couponValidateSchema), OfferController.validateCoupon);
router.get('/maps/geocode', Ent.geocode);
router.get('/maps/distance', Ent.routeDistance);
router.post('/maps/distance', Ent.routeDistance);
router.post(
  '/maps/fare-estimate',
  validate(
    z.object({
      body: z.object({
        origin: z.string().min(2),
        destination: z.string().min(2),
        busType: z.string().optional(),
        days: z.coerce.number().optional(),
        passengers: z.coerce.number().optional(),
      }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    }),
  ),
  Ent.estimateFare,
);
router.get('/vehicle-types', ContentController.publicVehicleTypes);
router.get('/services', ContentController.publicServices);
router.get('/services/:slug', ContentController.publicServiceBySlug);
router.get('/blogs', ContentController.publicBlogs);
router.get('/blogs/:slug', ContentController.publicBlogBySlug);
router.get('/blog-categories', ContentController.publicBlogCategories);
router.get('/blog-tags', ContentController.publicBlogTags);
router.get('/faqs', ContentController.publicFaqs);
router.get('/reviews/featured', ContentController.publicReviews);
router.get('/fleet', ContentController.publicFleet);
router.get('/sitemap-urls', ContentController.publicSitemap);

export default router;
