import { SeoSiteSettings } from '../models/SeoSiteSettings.js';
import { SeoPageMeta } from '../models/SeoPageMeta.js';
import { SeoRedirect } from '../models/SeoRedirect.js';
import { SeoLocation } from '../models/SeoLocation.js';
import { ProgrammaticSeoPage } from '../models/ProgrammaticSeoPage.js';
import { ServicePage } from '../models/ServicePage.js';
import { BlogPost } from '../models/BlogPost.js';
import { ContentPage } from '../models/ContentPage.js';
import { VehicleType } from '../models/VehicleType.js';
import { ApiError } from '../utils/ApiError.js';
import { applyTokens, countWords, hashContent } from '../utils/contentTokens.js';
import { buildInternalLinks } from './internalLink.service.js';
import { cached } from '../utils/cache.js';

export const getSiteSettings = async () => {
  let row = await SeoSiteSettings.findOne({ key: 'default' });
  if (!row) row = await SeoSiteSettings.create({ key: 'default' });
  return row;
};

export const updateSiteSettings = async (payload) => {
  const row = await getSiteSettings();
  Object.assign(row, payload);
  await row.save();
  return row;
};

export const publicSiteSeo = async () => {
  const s = await getSiteSettings();
  return {
    canonicalHost: s.canonicalHost,
    siteName: s.siteName,
    twitterHandle: s.twitterHandle,
    defaultMetaTitle: s.defaultMetaTitle,
    defaultMetaDescription: s.defaultMetaDescription,
    defaultKeywords: s.defaultKeywords,
    defaultOgImage: s.defaultOgImage,
    defaultTwitterCard: s.defaultTwitterCard,
    defaultRobots: s.defaultRobots,
    googleSiteVerification: s.googleSiteVerification,
    bingSiteVerification: s.bingSiteVerification,
    facebookDomainVerification: s.facebookDomainVerification,
    gaMeasurementId: s.gaMeasurementId,
    gtmContainerId: s.gtmContainerId,
    facebookPixelId: s.facebookPixelId,
    conversionLabels: s.conversionLabels,
    notFoundTitle: s.notFoundTitle,
    notFoundDescription: s.notFoundDescription,
    notFoundBodyHtml: s.notFoundBodyHtml,
    notFoundRobots: s.notFoundRobots,
  };
};

export const getRobotsTxt = async () => {
  const s = await getSiteSettings();
  return s.robotsTxtBody || '';
};

export const listPageMeta = async () => SeoPageMeta.find().sort({ path: 1 }).lean();
export const upsertPageMeta = async (payload) => {
  if (!payload.path) throw new ApiError(400, 'path required');
  return SeoPageMeta.findOneAndUpdate({ path: payload.path }, payload, { upsert: true, new: true });
};
export const deletePageMeta = async (id) => {
  await SeoPageMeta.findByIdAndDelete(id);
  return { ok: true };
};

export const listRedirects = async () => SeoRedirect.find().sort({ updatedAt: -1 }).lean();
export const upsertRedirect = async (payload) => {
  if (!payload.fromPath || !payload.toPath) throw new ApiError(400, 'fromPath and toPath required');
  if (payload.fromPath === payload.toPath) throw new ApiError(400, 'Redirect loop');
  return SeoRedirect.findOneAndUpdate({ fromPath: payload.fromPath }, payload, { upsert: true, new: true });
};
export const deleteRedirect = async (id) => {
  await SeoRedirect.findByIdAndDelete(id);
  return { ok: true };
};

export const matchRedirect = async (fromPath) => {
  const row = await SeoRedirect.findOne({ fromPath, enabled: true });
  if (!row) return null;
  row.hits += 1;
  await row.save();
  return { fromPath: row.fromPath, toPath: row.toPath, statusCode: row.statusCode };
};

export const resolveSeoForPath = async (path) => {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return cached(`seo:resolve:${clean}`, 5 * 60 * 1000, async () => {
    const site = await getSiteSettings();
    const override = await SeoPageMeta.findOne({ path: clean, status: 'active' }).lean();
    const entity = await findEntityMeta(clean);

    const metaTitle = override?.metaTitle || entity?.metaTitle || site.defaultMetaTitle;
    const metaDescription = override?.metaDescription || entity?.metaDescription || site.defaultMetaDescription;
    const keywords = override?.keywords?.length ? override.keywords : entity?.keywords?.length ? entity.keywords : site.defaultKeywords;
    const canonicalPath = override?.canonicalPath || entity?.canonicalPath || clean;
    const robots =
      override?.indexStatus === 'noindex' || override?.indexStatus === 'blocked'
        ? 'noindex,follow'
        : override?.robots || entity?.robots || site.defaultRobots;
    const ogImage = override?.ogImage || entity?.ogImage || site.defaultOgImage;

    return {
      path: clean,
      metaTitle,
      metaDescription,
      keywords,
      canonicalPath,
      canonicalUrl: `${site.canonicalHost.replace(/\/$/, '')}${canonicalPath}`,
      robots,
      ogTitle: override?.ogTitle || metaTitle,
      ogDescription: override?.ogDescription || metaDescription,
      ogImage,
      twitterTitle: override?.twitterTitle || metaTitle,
      twitterDescription: override?.twitterDescription || metaDescription,
      twitterImage: override?.twitterImage || ogImage,
      twitterCard: site.defaultTwitterCard,
      siteName: site.siteName,
      twitterHandle: site.twitterHandle,
      priority: override?.priority ?? site.defaultPriority,
      changefreq: override?.changefreq || site.defaultChangefreq,
      indexStatus: override?.indexStatus || (String(robots).includes('noindex') ? 'noindex' : 'index'),
      entityType: entity?.entityType || null,
    };
  });
};

const findEntityMeta = async (path) => {
  if (path.endsWith('-bus-rental') && !path.endsWith('-bus-rental-guide')) {
    const slug = path.slice(1, -'-bus-rental'.length);
    const city = await SeoLocation.findOne({ slug, type: 'city', status: 'published' }).lean();
    if (city) {
      return {
        entityType: 'city',
        metaTitle: city.metaTitle,
        metaDescription: city.metaDescription,
        keywords: city.keywords,
        canonicalPath: city.canonicalPath || path,
        ogImage: city.ogImage,
        robots: city.robots,
      };
    }
  }

  const prog = await ProgrammaticSeoPage.findOne({ canonicalPath: path, status: 'published' }).lean();
  if (prog) {
    return {
      entityType: 'programmatic',
      metaTitle: prog.metaTitle,
      metaDescription: prog.metaDescription,
      keywords: prog.keywords,
      canonicalPath: prog.canonicalPath,
      ogImage: prog.ogImage,
      robots: prog.robots,
    };
  }

  const content = await ContentPage.findOne({ path, status: 'published' }).lean();
  if (content) {
    return {
      entityType: content.contentType,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      keywords: content.keywords,
      canonicalPath: content.canonicalPath || path,
      ogImage: content.ogImage,
      robots: content.robots,
    };
  }

  if (path.startsWith('/blog/')) {
    const slug = path.replace('/blog/', '');
    const post = await BlogPost.findOne({ slug, status: 'published' }).lean();
    if (post) {
      return {
        entityType: 'blog',
        metaTitle: post.metaTitle || post.title,
        metaDescription: post.metaDescription || post.excerpt,
        keywords: post.keywords,
        canonicalPath: post.canonicalPath || path,
        ogImage: post.ogImage || post.featuredImage?.url,
        robots: post.robots,
      };
    }
  }

  for (const [prefix, category] of [
    ['/corporate/', 'corporate'],
    ['/industries/', 'industry'],
    ['/services/', 'service'],
  ]) {
    if (path.startsWith(prefix)) {
      const slug = path.slice(prefix.length);
      const page = await ServicePage.findOne({ slug, category, status: 'published' }).lean();
      if (page) {
        return {
          entityType: category,
          metaTitle: page.metaTitle || page.title,
          metaDescription: page.metaDescription || page.shortDescription,
          keywords: page.keywords,
          canonicalPath: page.canonicalPath || path,
          ogImage: page.ogImage || page.banner?.url,
          robots: page.robots,
        };
      }
    }
  }

  if (path.endsWith('-rental') && !path.endsWith('-bus-rental')) {
    const slug = path.slice(1, -'-rental'.length);
    const v = await VehicleType.findOne({ slug, status: 'active' }).lean();
    if (v) {
      return {
        entityType: 'vehicle',
        metaTitle: `${v.name} Rental India | Luxury Bus Rental`,
        metaDescription: v.description || `Hire ${v.name} across India.`,
        keywords: [v.name, `${v.slug} rental`],
        canonicalPath: path,
        ogImage: v.imageUrl || '',
        robots: 'index,follow',
      };
    }
  }

  return null;
};

export const getCityPage = async (slug) => {
  const city = await SeoLocation.findOne({ slug, type: 'city', status: { $in: ['published', 'noindex'] } }).lean();
  if (!city) throw new ApiError(404, 'City not found');
  const path = city.canonicalPath || `/${city.slug}-bus-rental`;
  const seo = await resolveSeoForPath(path);
  const internalLinks = await buildInternalLinks({
    pageType: 'city',
    slug: city.slug,
    citySlug: city.slug,
    cityName: city.name,
    path,
  });
  const nearbyAirports = city.nearbyAirportSlugs?.length
    ? await SeoLocation.find({ slug: { $in: city.nearbyAirportSlugs }, type: 'airport' }).lean()
    : [];
  const relatedCities = city.nearbyCitySlugs?.length
    ? await SeoLocation.find({ slug: { $in: city.nearbyCitySlugs }, type: 'city', status: 'published' }).lean()
    : [];
  return { city, seo, internalLinks, nearbyAirports, relatedCities };
};

export const getProgrammaticPage = async (slug) => {
  const page = await ProgrammaticSeoPage.findOne({ slug, status: { $in: ['published', 'noindex'] } }).lean();
  if (!page) throw new ApiError(404, 'SEO page not found');
  const seo = await resolveSeoForPath(page.canonicalPath);
  const internalLinks = await buildInternalLinks({
    pageType: 'programmatic',
    slug: page.slug,
    citySlug: page.locationSlug,
    path: page.canonicalPath,
  });
  return { page, seo, internalLinks };
};

export const enrichCityDefaults = (city) => {
  const name = city.name;
  const state = city.stateName || 'India';
  if (!city.metaTitle) city.metaTitle = `Bus Rental in ${name} | Luxury Coach & Corporate Fleet`;
  if (!city.metaDescription) {
    city.metaDescription = `Book bus rental in ${name}, ${state}. Volvo, Urbania, Tempo Traveller, corporate shuttles and airport transfers with Luxury Bus Rental India.`;
  }
  if (!city.keywords?.length) {
    city.keywords = [`bus rental ${name}`, `${name} luxury bus`, `corporate bus ${name}`, `urbania rental ${name}`];
  }
  if (!city.canonicalPath) city.canonicalPath = `/${city.slug}-bus-rental`;
  if (!city.description) {
    city.description = `${name} is a key mobility market in ${state}. Luxury Bus Rental India connects enterprises, event planners, and travellers with inspected coaches, Urbania vans, Tempo Travellers, and chauffeur-driven cabs for local and intercity travel. Whether you need employee transportation, airport transfers, wedding coaches, or VIP movement, our marketplace aggregates verified vendors with transparent quotes and trip support.`;
  }
  if (!city.faqs?.length) {
    city.faqs = [
      {
        question: `How do I book a bus rental in ${name}?`,
        answer: `Share your trip dates, passenger count, and route on our booking form. You will receive vendor quotes for ${name} and can confirm online.`,
      },
      {
        question: `Which vehicles are available in ${name}?`,
        answer: `Depending on demand you can hire luxury coaches, mini buses, Urbania, Tempo Traveller, Innova Crysta, and executive cabs across ${name}.`,
      },
      {
        question: `Do you offer corporate employee transportation in ${name}?`,
        answer: `Yes. We support shift-based employee shuttles, factory routes, and long-term corporate fleet contracts in ${name}.`,
      },
      {
        question: `Are airport transfers available from ${name}?`,
        answer: `Yes. Airport transfers and crew movements can be arranged for nearby airports serving ${name}.`,
      },
    ];
  }
  if (!city.popularIndustries?.length) {
    city.popularIndustries = [
      { name: 'IT & BPM', href: '/industries/industrial-transportation', blurb: `Campus and night-shift shuttles in ${name}.` },
      { name: 'Manufacturing', href: '/industries/factory-transportation', blurb: `Factory gate transportation programs.` },
      { name: 'Tourism', href: '/industries/tourist-transportation', blurb: `Group sightseeing and hotel transfers.` },
      { name: 'Healthcare', href: '/industries/hospital-transportation', blurb: `Staff and patient support movement.` },
    ];
  }
  if (!city.relatedServiceSlugs?.length) {
    city.relatedServiceSlugs = ['corporate-bus-rental', 'employee-transportation', 'airport-transfers', 'urbania-rental'];
  }
  if (!city.vehicleAvailabilitySlugs?.length) {
    city.vehicleAvailabilitySlugs = ['luxury-bus', 'urbania', 'tempo-traveller', 'mini-bus', 'innova-crysta', 'cab'];
  }
  if (!city.pricingHints?.notes) {
    city.pricingHints = {
      currency: 'INR',
      notes: `Indicative ${name} hire rates vary by vehicle, duty type, and season. Request a live quote for exact pricing.`,
      seaterBands: ['12–20 seater from local Tempo/Urbania duty', '27–45 seater coach for groups', 'Full luxury coach for long hauls'],
    };
  }
  if (!city.metroNotes) {
    city.metroNotes = `${name} is accessible via regional road corridors and connecting rail/air gateways. Our vendors plan pickup points around major business districts and hotels.`;
  }
  city.wordCount = countWords(
    [city.description, city.metroNotes, ...(city.faqs || []).map((f) => `${f.question} ${f.answer}`)].join(' '),
  );
  city.contentHash = hashContent(city.description + city.metaTitle);
  return city;
};

export const renderProgrammaticFromIntent = (intent, location) => {
  const tokens = {
    Intent: intent.name,
    City: location.name,
    State: location.stateName || 'India',
    Vehicle: intent.vehicleTypeSlug || intent.name,
    Service: intent.servicePageSlug || intent.name,
  };
  const slug = `${intent.slug}-${location.slug}`;
  const title = applyTokens(intent.titleTemplate, tokens);
  const h1 = applyTokens(intent.h1Template, tokens);
  const metaDescription = applyTokens(intent.descriptionTemplate, tokens);
  const body = applyTokens(
    intent.bodyTemplate ||
      `{Intent} in {City}, {State} is delivered through Luxury Bus Rental India's verified vendor network. Choose coaches, Urbania, Tempo Traveller, or executive cabs with transparent quotes, trip tracking, and corporate invoicing support. Popular use cases include employee commute, airport transfers, events, and VIP movement across {City}.`,
    tokens,
  );
  const faqs = (intent.faqTemplates?.length ? intent.faqTemplates : [
    { question: `How to book {Intent} in {City}?`, answer: `Submit your trip details online and compare quotes for {Intent} in {City}.` },
    { question: `What vehicles support {Intent} in {City}?`, answer: `Fleet mix typically includes luxury buses, Urbania, Tempo Traveller, and cabs based on headcount.` },
  ]).map((f) => ({
    question: applyTokens(f.question, tokens),
    answer: applyTokens(f.answer, tokens),
  }));
  const keywords = (intent.keywordTemplates?.length
    ? intent.keywordTemplates
    : ['{Intent} {City}', '{Intent} in {City}', 'bus rental {City}']
  ).map((k) => applyTokens(k, tokens));

  return {
    slug,
    canonicalPath: `/${slug}`,
    intentSlug: intent.slug,
    locationSlug: location.slug,
    intentType: intent.intentType,
    locationType: location.type,
    servicePageSlug: intent.servicePageSlug || '',
    vehicleTypeSlug: intent.vehicleTypeSlug || '',
    title,
    h1,
    metaTitle: title,
    metaDescription,
    keywords,
    body,
    faqs,
    nearbyCitySlugs: location.nearbyCitySlugs || [],
    nearbyAirportSlugs: location.nearbyAirportSlugs || [],
    nearbyDestinationSlugs: location.nearbyDestinationSlugs || [],
    wordCount: countWords(body + faqs.map((f) => f.question + f.answer).join(' ')),
    contentHash: hashContent(body + title),
    status: 'published',
    publishedAt: new Date(),
    robots: 'index,follow',
  };
};

export const expandSitemapUrls = async () => {
  const site = await getSiteSettings();
  const urls = [];
  const push = (path, changefreq, priority) => {
    urls.push({
      path,
      changefreq: changefreq || site.defaultChangefreq,
      priority: priority ?? site.defaultPriority,
    });
  };

  ['/', '/book', '/about', '/contact', '/blog', '/services', '/corporate', '/industries', '/bus-types-for-hire', '/sitemap'].forEach(
    (p) => push(p, 'weekly', p === '/' ? 1 : 0.8),
  );

  const metas = await SeoPageMeta.find({ status: 'active', indexStatus: 'index' }).lean();
  const metaMap = new Map(metas.map((m) => [m.path, m]));

  const cities = await SeoLocation.find({ type: 'city', status: 'published' }).select('slug canonicalPath').lean();
  cities.forEach((c) => {
    const path = c.canonicalPath || `/${c.slug}-bus-rental`;
    const m = metaMap.get(path);
    if (m?.indexStatus === 'blocked' || m?.indexStatus === 'noindex') return;
    push(path, m?.changefreq, m?.priority ?? 0.8);
  });

  const services = await ServicePage.find({ status: 'published' }).select('slug category canonicalPath').lean();
  services.forEach((p) => {
    const hub = p.category === 'corporate' ? 'corporate' : p.category === 'industry' ? 'industries' : 'services';
    const path = p.canonicalPath || `/${hub}/${p.slug}`;
    const m = metaMap.get(path);
    if (m?.indexStatus === 'noindex' || m?.indexStatus === 'blocked') return;
    push(path, m?.changefreq, m?.priority ?? 0.75);
  });

  const blogs = await BlogPost.find({ status: 'published' }).select('slug canonicalPath').lean();
  blogs.forEach((b) => push(b.canonicalPath || `/blog/${b.slug}`, 'monthly', 0.6));

  const prog = await ProgrammaticSeoPage.find({ status: 'published' }).select('canonicalPath').lean();
  prog.forEach((p) => {
    const m = metaMap.get(p.canonicalPath);
    if (m?.indexStatus === 'noindex' || m?.indexStatus === 'blocked') return;
    push(p.canonicalPath, m?.changefreq, m?.priority ?? 0.65);
  });

  const vehicles = await VehicleType.find({ status: 'active' }).select('slug').lean();
  vehicles.forEach((v) => push(`/${v.slug}-rental`, 'weekly', 0.7));

  const content = await ContentPage.find({ status: 'published' }).select('path').lean();
  content.forEach((c) => push(c.path, 'weekly', 0.7));

  const dedup = new Map();
  urls.forEach((u) => dedup.set(u.path, u));
  return { urls: [...dedup.values()], host: site.canonicalHost };
};
