import * as Seo from '../services/seo.service.js';
import { buildInternalLinks, auditOrphanPages } from '../services/internalLink.service.js';
import { SeoLocation } from '../models/SeoLocation.js';
import { SeoIntent } from '../models/SeoIntent.js';
import { ProgrammaticSeoPage } from '../models/ProgrammaticSeoPage.js';
import { ContentTemplate } from '../models/ContentTemplate.js';
import { ContentPage } from '../models/ContentPage.js';
import { BlogAuthor } from '../models/BlogAuthor.js';
import { ApiError } from '../utils/ApiError.js';
import { applyTokens, countWords, hashContent, extractToc } from '../utils/contentTokens.js';

const ok = (res, data) => res.json(data);

export const publicSite = async (_req, res, next) => {
  try {
    ok(res, await Seo.publicSiteSeo());
  } catch (e) {
    next(e);
  }
};

export const publicRobots = async (_req, res, next) => {
  try {
    const body = await Seo.getRobotsTxt();
    res.type('text/plain').send(body);
  } catch (e) {
    next(e);
  }
};

export const publicResolve = async (req, res, next) => {
  try {
    const path = String(req.query.path || '/');
    ok(res, await Seo.resolveSeoForPath(path));
  } catch (e) {
    next(e);
  }
};

export const publicRedirects = async (_req, res, next) => {
  try {
    const rows = await Seo.listRedirects();
    ok(res, { redirects: rows.filter((r) => r.enabled) });
  } catch (e) {
    next(e);
  }
};

export const publicMatchRedirect = async (req, res, next) => {
  try {
    const path = String(req.query.path || '');
    ok(res, { redirect: await Seo.matchRedirect(path) });
  } catch (e) {
    next(e);
  }
};

export const publicCity = async (req, res, next) => {
  try {
    ok(res, await Seo.getCityPage(req.params.slug));
  } catch (e) {
    next(e);
  }
};

export const publicCities = async (req, res, next) => {
  try {
    const filter = { type: 'city', status: 'published' };
    if (req.query.tier) filter.tier = Number(req.query.tier);
    const cities = await SeoLocation.find(filter).sort({ tier: 1, name: 1 }).select('slug name stateName tier').lean();
    ok(res, { cities });
  } catch (e) {
    next(e);
  }
};

export const publicProgrammatic = async (req, res, next) => {
  try {
    ok(res, await Seo.getProgrammaticPage(req.params.slug));
  } catch (e) {
    next(e);
  }
};

export const publicInternalLinks = async (req, res, next) => {
  try {
    ok(
      res,
      await buildInternalLinks({
        pageType: req.query.pageType || 'page',
        slug: req.query.slug || '',
        citySlug: req.query.citySlug || '',
        cityName: req.query.cityName || '',
        path: req.query.path || '',
      }),
    );
  } catch (e) {
    next(e);
  }
};

export const publicNavLinks = async (_req, res, next) => {
  try {
    const links = await buildInternalLinks({ pageType: 'home', slug: 'home', path: '/' });
    ok(res, {
      headerLinks: links.headerLinks,
      footerLinks: links.footerLinks,
      trendingCities: links.trendingCities,
      popularSearches: links.popularSearches,
      latestBlogs: links.latestBlogs,
      mostBookedVehicles: links.mostBookedVehicles,
    });
  } catch (e) {
    next(e);
  }
};

export const publicSitemap = async (_req, res, next) => {
  try {
    ok(res, await Seo.expandSitemapUrls());
  } catch (e) {
    next(e);
  }
};

export const publicContentByPath = async (req, res, next) => {
  try {
    const path = String(req.query.path || '');
    const page = await ContentPage.findOne({ path, status: 'published' }).lean();
    if (!page) throw new ApiError(404, 'Content not found');
    const seo = await Seo.resolveSeoForPath(path);
    const internalLinks = await buildInternalLinks({
      pageType: page.contentType,
      slug: page.slug,
      citySlug: page.citySlug,
      path,
    });
    ok(res, { page, seo, internalLinks });
  } catch (e) {
    next(e);
  }
};

export const publicContentByTypeSlug = async (req, res, next) => {
  try {
    const page = await ContentPage.findOne({
      contentType: req.params.type,
      slug: req.params.slug,
      status: 'published',
    }).lean();
    if (!page) throw new ApiError(404, 'Content not found');
    const seo = await Seo.resolveSeoForPath(page.path);
    const internalLinks = await buildInternalLinks({
      pageType: page.contentType,
      slug: page.slug,
      citySlug: page.citySlug,
      path: page.path,
    });
    ok(res, { page, seo, internalLinks });
  } catch (e) {
    next(e);
  }
};

/* Admin */
export const adminSiteGet = async (_req, res, next) => {
  try {
    ok(res, await Seo.getSiteSettings());
  } catch (e) {
    next(e);
  }
};
export const adminSitePatch = async (req, res, next) => {
  try {
    ok(res, await Seo.updateSiteSettings(req.body));
  } catch (e) {
    next(e);
  }
};
export const adminPageMetaList = async (_req, res, next) => {
  try {
    ok(res, { pages: await Seo.listPageMeta() });
  } catch (e) {
    next(e);
  }
};
export const adminPageMetaUpsert = async (req, res, next) => {
  try {
    ok(res, await Seo.upsertPageMeta(req.body));
  } catch (e) {
    next(e);
  }
};
export const adminPageMetaDelete = async (req, res, next) => {
  try {
    ok(res, await Seo.deletePageMeta(req.params.id));
  } catch (e) {
    next(e);
  }
};
export const adminRedirectList = async (_req, res, next) => {
  try {
    ok(res, { redirects: await Seo.listRedirects() });
  } catch (e) {
    next(e);
  }
};
export const adminRedirectUpsert = async (req, res, next) => {
  try {
    ok(res, await Seo.upsertRedirect(req.body));
  } catch (e) {
    next(e);
  }
};
export const adminRedirectDelete = async (req, res, next) => {
  try {
    ok(res, await Seo.deleteRedirect(req.params.id));
  } catch (e) {
    next(e);
  }
};
export const adminOrphans = async (_req, res, next) => {
  try {
    ok(res, await auditOrphanPages());
  } catch (e) {
    next(e);
  }
};

export const adminLocations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    ok(res, { locations: await SeoLocation.find(filter).sort({ tier: 1, name: 1 }).lean() });
  } catch (e) {
    next(e);
  }
};
export const adminLocationUpsert = async (req, res, next) => {
  try {
    const data = Seo.enrichCityDefaults({ ...req.body });
    if (!data.slug) throw new ApiError(400, 'slug required');
    const row = await SeoLocation.findOneAndUpdate({ slug: data.slug }, data, { upsert: true, new: true });
    ok(res, row);
  } catch (e) {
    next(e);
  }
};

export const adminIntents = async (_req, res, next) => {
  try {
    ok(res, { intents: await SeoIntent.find().sort({ name: 1 }).lean() });
  } catch (e) {
    next(e);
  }
};
export const adminIntentUpsert = async (req, res, next) => {
  try {
    if (!req.body.slug) throw new ApiError(400, 'slug required');
    ok(res, await SeoIntent.findOneAndUpdate({ slug: req.body.slug }, req.body, { upsert: true, new: true }));
  } catch (e) {
    next(e);
  }
};

export const adminGenerateProgrammatic = async (req, res, next) => {
  try {
    const maxTier = Number(req.body.maxTier || 1);
    const intents = await SeoIntent.find({ status: 'active' }).lean();
    const locations = await SeoLocation.find({ type: 'city', status: 'published', tier: { $lte: maxTier } }).lean();
    let upserted = 0;
    for (const intent of intents) {
      for (const loc of locations) {
        if (loc.tier > (intent.minTier || 2)) continue;
        const doc = Seo.renderProgrammaticFromIntent(intent, loc);
        await ProgrammaticSeoPage.findOneAndUpdate(
          { intentSlug: intent.slug, locationSlug: loc.slug },
          doc,
          { upsert: true, new: true },
        );
        upserted += 1;
      }
    }
    ok(res, { ok: true, upserted });
  } catch (e) {
    next(e);
  }
};

export const adminProgrammaticList = async (_req, res, next) => {
  try {
    ok(res, {
      pages: await ProgrammaticSeoPage.find().sort({ updatedAt: -1 }).limit(500).lean(),
    });
  } catch (e) {
    next(e);
  }
};

export const adminTemplates = async (_req, res, next) => {
  try {
    ok(res, { templates: await ContentTemplate.find().lean() });
  } catch (e) {
    next(e);
  }
};

export const adminTemplateUpsert = async (req, res, next) => {
  try {
    if (!req.body.key) throw new ApiError(400, 'key required');
    ok(res, await ContentTemplate.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true }));
  } catch (e) {
    next(e);
  }
};

export const adminContentPages = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.contentType) filter.contentType = req.query.contentType;
    ok(res, { pages: await ContentPage.find(filter).sort({ updatedAt: -1 }).limit(500).lean() });
  } catch (e) {
    next(e);
  }
};

export const adminContentUpsert = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.slug || !body.contentType || !body.templateKey) {
      throw new ApiError(400, 'slug, contentType, templateKey required');
    }
    const template = await ContentTemplate.findOne({ key: body.templateKey }).lean();
    const tokens = {
      Title: body.title,
      Description: body.metaDescription || body.title,
      City: body.citySlug || '',
      Service: body.serviceSlug || body.title,
      Industry: body.industrySlug || '',
      Vehicle: body.vehicleSlug || '',
    };
    if (!body.path) {
      const map = {
        service: `/services/${body.slug}`,
        industry: `/industries/${body.slug}`,
        corporate: `/corporate/${body.slug}`,
        city: `/${body.slug}-bus-rental`,
        vehicle: `/${body.slug}-rental`,
        route: `/routes/${body.slug}`,
        destination: `/destinations/${body.slug}`,
        airport: `/airports/${body.slug}`,
        faq: `/faqs/${body.slug}`,
        landing: `/lp/${body.slug}`,
        blog: `/blog/${body.slug}`,
      };
      body.path = map[body.contentType] || `/${body.slug}`;
    }
    if (!body.seoLocked && template) {
      body.metaTitle = body.metaTitle || applyTokens(template.seoTitleTemplate, tokens);
      body.metaDescription = body.metaDescription || applyTokens(template.seoDescriptionTemplate, tokens);
      body.keywords = body.keywords?.length
        ? body.keywords
        : (template.keywordTemplates || []).map((k) => applyTokens(k, tokens));
      if (!body.faqs?.length && template.faqTemplates?.length) {
        body.faqs = template.faqTemplates.map((f) => ({
          question: applyTokens(f.question, tokens),
          answer: applyTokens(f.answer, tokens),
        }));
      }
    }
    body.canonicalPath = body.canonicalPath || body.path;
    const blockText = JSON.stringify(body.blocks || {});
    body.wordCount = countWords(blockText + (body.metaDescription || ''));
    body.contentHash = hashContent(blockText + body.metaTitle);
    if (body.status === 'published' && !body.publishedAt) body.publishedAt = new Date();
    const row = await ContentPage.findOneAndUpdate(
      { contentType: body.contentType, slug: body.slug },
      body,
      { upsert: true, new: true },
    );
    ok(res, row);
  } catch (e) {
    next(e);
  }
};

export const adminAuthors = async (_req, res, next) => {
  try {
    ok(res, { authors: await BlogAuthor.find().sort({ name: 1 }).lean() });
  } catch (e) {
    next(e);
  }
};
export const adminAuthorUpsert = async (req, res, next) => {
  try {
    if (!req.body.slug || !req.body.name) throw new ApiError(400, 'name and slug required');
    ok(res, await BlogAuthor.findOneAndUpdate({ slug: req.body.slug }, req.body, { upsert: true, new: true }));
  } catch (e) {
    next(e);
  }
};

export const adminRebuildToc = async (req, res, next) => {
  try {
    const { BlogPost } = await import('../models/BlogPost.js');
    const post = await BlogPost.findById(req.params.id);
    if (!post) throw new ApiError(404, 'Post not found');
    post.toc = extractToc(post.content);
    await post.save();
    ok(res, post);
  } catch (e) {
    next(e);
  }
};
