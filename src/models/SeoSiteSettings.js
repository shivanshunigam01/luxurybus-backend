import mongoose from 'mongoose';

const conversionSchema = new mongoose.Schema(
  {
    name: String,
    event: String,
    pixelEvent: { type: String, default: '' },
    gtagSendTo: { type: String, default: '' },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    canonicalHost: { type: String, default: 'https://www.luxurybusrental.in' },
    siteName: { type: String, default: 'Luxury Bus Rental' },
    twitterHandle: { type: String, default: '@LuxuryBusRental' },
    defaultMetaTitle: {
      type: String,
      default: 'Luxury Bus Rental India | Volvo, Urbania & Corporate Fleet',
    },
    defaultMetaDescription: {
      type: String,
      default:
        'Book luxury bus rental across India — corporate transport, employee shuttles, airport transfers, Urbania, Tempo Traveller and VIP coaches.',
    },
    defaultKeywords: {
      type: [String],
      default: ['luxury bus rental', 'corporate bus rental india', 'urbania rental', 'employee transportation'],
    },
    defaultOgImage: { type: String, default: '' },
    defaultTwitterCard: { type: String, default: 'summary_large_image' },
    defaultRobots: { type: String, default: 'index,follow' },
    enableOrganization: { type: Boolean, default: true },
    enableWebsite: { type: Boolean, default: true },
    organizationJson: { type: mongoose.Schema.Types.Mixed, default: {} },
    sitemapEnabled: { type: Boolean, default: true },
    defaultChangefreq: { type: String, default: 'weekly' },
    defaultPriority: { type: Number, default: 0.7 },
    robotsTxtBody: {
      type: String,
      default:
        'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /vendor/\nDisallow: /customer/\nDisallow: /b2b/\nSitemap: https://www.luxurybusrental.in/sitemap.xml\n',
    },
    notFoundTitle: { type: String, default: 'Page not found | Luxury Bus Rental' },
    notFoundDescription: { type: String, default: 'The page you requested is unavailable.' },
    notFoundBodyHtml: {
      type: String,
      default: '<p>Sorry, we could not find that page. Try our homepage or book a bus rental.</p>',
    },
    notFoundRobots: { type: String, default: 'noindex,follow' },
    googleSiteVerification: { type: String, default: '' },
    bingSiteVerification: { type: String, default: '' },
    facebookDomainVerification: { type: String, default: '' },
    gaMeasurementId: { type: String, default: '' },
    gtmContainerId: { type: String, default: '' },
    facebookPixelId: { type: String, default: '' },
    conversionLabels: { type: [conversionSchema], default: [] },
  },
  { timestamps: true },
);

export const SeoSiteSettings = mongoose.model('SeoSiteSettings', schema);
