import { SeoLocation } from '../models/SeoLocation.js';
import { ServicePage } from '../models/ServicePage.js';
import { VehicleType } from '../models/VehicleType.js';
import { BlogPost } from '../models/BlogPost.js';
import { SiteFaq } from '../models/SiteFaq.js';
import { ProgrammaticSeoPage } from '../models/ProgrammaticSeoPage.js';
import { anchorVariant } from '../utils/contentTokens.js';
import { cached } from '../utils/cache.js';

const link = (href, anchor, cluster, priority = 50) => ({ href, anchor, cluster, priority, title: anchor });

const cityAnchors = (city) => [
  `Bus rental in ${city}`,
  `${city} luxury bus hire`,
  `${city} corporate bus rental`,
];

const vehicleAnchors = (name, city) =>
  city
    ? [`${name} on rent in ${city}`, `Hire ${name} in ${city}`, `${name} rental ${city}`]
    : [`${name} rental India`, `Hire ${name}`, `${name} on rent`];

export const buildInternalLinks = async (ctx = {}) => {
  const { pageType = 'page', slug = '', citySlug = '', cityName = '', path = '' } = ctx;
  const cacheKey = `links:${pageType}:${slug || path || 'home'}`;
  return cached(cacheKey, 60 * 60 * 1000, async () => {
    const clusters = {
      relatedCities: [],
      nearbyCities: [],
      relatedVehicles: [],
      relatedIndustries: [],
      relatedBlogs: [],
      relatedServices: [],
      relatedFaqs: [],
      popularSearches: [],
      latestBlogs: [],
      mostBookedVehicles: [],
      topRoutes: [],
      trendingCities: [],
      footerLinks: [],
      headerLinks: [],
      breadcrumbs: [],
    };

    const city = citySlug
      ? await SeoLocation.findOne({ slug: citySlug, type: 'city', status: 'published' }).lean()
      : null;
    const displayCity = cityName || city?.name || '';

    const nearby = city?.nearbyCitySlugs?.length
      ? await SeoLocation.find({ slug: { $in: city.nearbyCitySlugs }, status: 'published' }).limit(8).lean()
      : await SeoLocation.find({
          type: 'city',
          status: 'published',
          stateName: city?.stateName || { $exists: true },
          slug: { $ne: citySlug || null },
        })
          .sort({ tier: 1 })
          .limit(8)
          .lean();

    for (const c of nearby) {
      const href = `/${c.slug}-bus-rental`;
      clusters.nearbyCities.push(link(href, anchorVariant(`${slug}:${href}`, cityAnchors(c.name)), 'nearbyCities'));
      clusters.relatedCities.push(
        link(href, anchorVariant(`${slug}:rel:${href}`, cityAnchors(c.name)), 'relatedCities', 40),
      );
    }

    const trending = await SeoLocation.find({ type: 'city', status: 'published', tier: 1 })
      .sort({ name: 1 })
      .limit(8)
      .lean();
    for (const c of trending) {
      const href = `/${c.slug}-bus-rental`;
      clusters.trendingCities.push(link(href, anchorVariant(`trend:${href}`, cityAnchors(c.name)), 'trendingCities', 30));
    }

    const vehicles = await VehicleType.find({ status: 'active' }).sort({ sortOrder: 1 }).limit(8).lean();
    for (const v of vehicles) {
      const href = `/${v.slug}-rental`;
      clusters.relatedVehicles.push(
        link(href, anchorVariant(`${slug}:${href}`, vehicleAnchors(v.name, displayCity)), 'relatedVehicles'),
      );
      clusters.mostBookedVehicles.push(
        link(href, anchorVariant(`booked:${href}`, vehicleAnchors(v.name)), 'mostBookedVehicles', 35),
      );
    }

    const industries = await ServicePage.find({ category: 'industry', status: 'published' })
      .sort({ sortOrder: 1 })
      .limit(6)
      .lean();
    for (const p of industries) {
      const href = p.canonicalPath || `/industries/${p.slug}`;
      clusters.relatedIndustries.push(link(href, p.title, 'relatedIndustries'));
    }

    const services = await ServicePage.find({ status: 'published' }).sort({ featured: -1, sortOrder: 1 }).limit(8).lean();
    for (const p of services) {
      const hub = p.category === 'corporate' ? 'corporate' : p.category === 'industry' ? 'industries' : 'services';
      const href = p.canonicalPath || `/${hub}/${p.slug}`;
      clusters.relatedServices.push(link(href, p.title, 'relatedServices'));
    }

    const blogs = await BlogPost.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(8).lean();
    blogs.slice(0, 5).forEach((b) => {
      clusters.latestBlogs.push(link(`/blog/${b.slug}`, b.title, 'latestBlogs'));
    });
    blogs
      .filter((b) => b.featured)
      .slice(0, 5)
      .forEach((b) => {
        clusters.relatedBlogs.push(link(`/blog/${b.slug}`, b.title, 'relatedBlogs', 45));
      });
    if (!clusters.relatedBlogs.length) {
      blogs.slice(0, 4).forEach((b) => clusters.relatedBlogs.push(link(`/blog/${b.slug}`, b.title, 'relatedBlogs')));
    }

    const faqs = await SiteFaq.find({ status: 'active' }).sort({ sortOrder: 1 }).limit(5).lean();
    faqs.forEach((f, i) => {
      clusters.relatedFaqs.push(link(`/faqs#faq-${i}`, f.question || 'FAQ', 'relatedFaqs'));
    });

    if (city?.popularRoutes?.length) {
      city.popularRoutes.slice(0, 6).forEach((r) => {
        clusters.topRoutes.push(link(r.href || '/book', `${r.fromLabel} to ${r.toLabel}`, 'topRoutes'));
      });
    } else {
      ['delhi', 'mumbai', 'bangalore', 'hyderabad'].forEach((s) => {
        clusters.topRoutes.push(link(`/${s}-bus-rental`, `Popular bus rental in ${s}`, 'topRoutes'));
      });
    }

    const popular = [
      { href: '/corporate/corporate-bus-rental', anchor: 'Corporate bus rental' },
      { href: '/corporate/employee-transportation', anchor: 'Employee transportation' },
      { href: '/services/urbania-rental', anchor: 'Urbania rental' },
      { href: '/services/tempo-traveller-rental', anchor: 'Tempo Traveller rental' },
      { href: '/book', anchor: 'Book luxury bus online' },
      { href: '/delhi-bus-rental', anchor: 'Bus rental in Delhi' },
    ];
    popular.forEach((p) => clusters.popularSearches.push(link(p.href, p.anchor, 'popularSearches')));

    clusters.headerLinks = [
      link('/corporate', 'Corporate', 'headerLinks'),
      link('/industries', 'Industries', 'headerLinks'),
      link('/services', 'Services', 'headerLinks'),
      link('/blog', 'Blog', 'headerLinks'),
      link('/book', 'Book now', 'headerLinks'),
    ];
    clusters.footerLinks = [
      ...clusters.trendingCities.slice(0, 6),
      ...clusters.relatedServices.slice(0, 6),
      link('/about', 'About us', 'footerLinks'),
      link('/contact', 'Contact', 'footerLinks'),
      link('/policies/refund-cancellation', 'Refund policy', 'footerLinks'),
      link('/sitemap', 'Sitemap', 'footerLinks'),
    ];

    if (pageType === 'city' && displayCity) {
      clusters.breadcrumbs = [
        link('/', 'Home', 'breadcrumbs'),
        link('/bus-rental', 'Bus rental', 'breadcrumbs'),
        link(path || `/${citySlug}-bus-rental`, `Bus rental in ${displayCity}`, 'breadcrumbs'),
      ];
    } else if (pageType === 'programmatic') {
      clusters.breadcrumbs = [
        link('/', 'Home', 'breadcrumbs'),
        link(path || `/${slug}`, slug.replace(/-/g, ' '), 'breadcrumbs'),
      ];
    } else {
      clusters.breadcrumbs = [link('/', 'Home', 'breadcrumbs'), link(path || `/${slug}`, slug || 'Page', 'breadcrumbs')];
    }

    const flat = [];
    const seen = new Set();
    for (const [clusterName, items] of Object.entries(clusters)) {
      if (clusterName === 'breadcrumbs' || clusterName === 'headerLinks' || clusterName === 'footerLinks') continue;
      for (const item of items) {
        if (!item.href || item.href === path || seen.has(item.href)) continue;
        seen.add(item.href);
        flat.push(item);
      }
    }
    const fillers = [...clusters.trendingCities, ...clusters.relatedServices, ...clusters.latestBlogs];
    for (const item of fillers) {
      if (flat.length >= 20) break;
      if (!item.href || item.href === path || seen.has(item.href)) continue;
      seen.add(item.href);
      flat.push(item);
      clusters.relatedServices.push(item);
    }

    return {
      ...clusters,
      totalUnique: flat.length,
      links: flat.slice(0, 40),
    };
  });
};

export const auditOrphanPages = async () => {
  const urls = new Set(['/', '/book', '/blog', '/services', '/corporate', '/industries']);
  const cities = await SeoLocation.find({ status: 'published', type: 'city' }).select('slug').lean();
  cities.forEach((c) => urls.add(`/${c.slug}-bus-rental`));
  const services = await ServicePage.find({ status: 'published' }).select('slug category canonicalPath').lean();
  services.forEach((p) => {
    const hub = p.category === 'corporate' ? 'corporate' : p.category === 'industry' ? 'industries' : 'services';
    urls.add(p.canonicalPath || `/${hub}/${p.slug}`);
  });
  const blogs = await BlogPost.find({ status: 'published' }).select('slug').lean();
  blogs.forEach((b) => urls.add(`/blog/${b.slug}`));
  const prog = await ProgrammaticSeoPage.find({ status: 'published' }).select('canonicalPath').lean();
  prog.forEach((p) => urls.add(p.canonicalPath));

  const linked = new Set(['/']);
  const sample = await buildInternalLinks({ pageType: 'home', slug: 'home', path: '/' });
  [...sample.footerLinks, ...sample.headerLinks, ...sample.links].forEach((l) => linked.add(l.href));

  const orphans = [...urls].filter((u) => !linked.has(u)).slice(0, 200);
  return { totalPages: urls.size, linkedFromNav: linked.size, orphans };
};
