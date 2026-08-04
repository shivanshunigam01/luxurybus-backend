import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { SeoLocation } from '../src/models/SeoLocation.js';
import { SeoIntent } from '../src/models/SeoIntent.js';
import { SeoSiteSettings } from '../src/models/SeoSiteSettings.js';
import { ContentTemplate } from '../src/models/ContentTemplate.js';
import { ProgrammaticSeoPage } from '../src/models/ProgrammaticSeoPage.js';
import { BlogAuthor } from '../src/models/BlogAuthor.js';
import { SeoRedirect } from '../src/models/SeoRedirect.js';
import { enrichCityDefaults, renderProgrammaticFromIntent } from '../src/services/seo.service.js';
import { slugify } from '../src/utils/slugify.js';

const PRIORITY = [
  ['Delhi', 'Delhi', 1],
  ['Mumbai', 'Maharashtra', 1],
  ['Ahmedabad', 'Gujarat', 1],
  ['Pune', 'Maharashtra', 1],
  ['Bangalore', 'Karnataka', 1],
  ['Hyderabad', 'Telangana', 1],
  ['Chennai', 'Tamil Nadu', 1],
  ['Kolkata', 'West Bengal', 1],
  ['Jaipur', 'Rajasthan', 1],
  ['Lucknow', 'Uttar Pradesh', 1],
  ['Indore', 'Madhya Pradesh', 1],
  ['Nagpur', 'Maharashtra', 1],
  ['Surat', 'Gujarat', 1],
  ['Noida', 'Uttar Pradesh', 1],
  ['Gurgaon', 'Haryana', 1],
  ['Faridabad', 'Haryana', 1],
  ['Ghaziabad', 'Uttar Pradesh', 1],
  ['Patna', 'Bihar', 1],
  ['Bhopal', 'Madhya Pradesh', 1],
  ['Chandigarh', 'Chandigarh', 1],
  ['Vadodara', 'Gujarat', 1],
  ['Rajkot', 'Gujarat', 1],
  ['Udaipur', 'Rajasthan', 1],
  ['Jodhpur', 'Rajasthan', 1],
  ['Goa', 'Goa', 1],
  ['Agra', 'Uttar Pradesh', 1],
  ['Varanasi', 'Uttar Pradesh', 1],
  ['Amritsar', 'Punjab', 1],
  ['Dehradun', 'Uttarakhand', 1],
  ['Shimla', 'Himachal Pradesh', 1],
  ['Manali', 'Himachal Pradesh', 1],
  ['Rishikesh', 'Uttarakhand', 1],
  ['Haridwar', 'Uttarakhand', 1],
  ['Leh', 'Ladakh', 1],
  ['Srinagar', 'Jammu and Kashmir', 1],
  ['Mysore', 'Karnataka', 1],
  ['Coimbatore', 'Tamil Nadu', 1],
  ['Kochi', 'Kerala', 1],
  ['Vizag', 'Andhra Pradesh', 1],
  ['Bhubaneswar', 'Odisha', 1],
];

/** Extra cities to push toward 500+ coverage (tier 2). */
const EXTRA_CITIES = [
  ['Kanpur', 'Uttar Pradesh'],
  ['Allahabad', 'Uttar Pradesh'],
  ['Meerut', 'Uttar Pradesh'],
  ['Nashik', 'Maharashtra'],
  ['Thane', 'Maharashtra'],
  ['Aurangabad', 'Maharashtra'],
  ['Raipur', 'Chhattisgarh'],
  ['Ranchi', 'Jharkhand'],
  ['Jamshedpur', 'Jharkhand'],
  ['Guwahati', 'Assam'],
  ['Trivandrum', 'Kerala'],
  ['Calicut', 'Kerala'],
  ['Madurai', 'Tamil Nadu'],
  ['Tiruchirappalli', 'Tamil Nadu'],
  ['Hubli', 'Karnataka'],
  ['Mangalore', 'Karnataka'],
  ['Warangal', 'Telangana'],
  ['Vijayawada', 'Andhra Pradesh'],
  ['Guntur', 'Andhra Pradesh'],
  ['Jabalpur', 'Madhya Pradesh'],
  ['Gwalior', 'Madhya Pradesh'],
  ['Kota', 'Rajasthan'],
  ['Ajmer', 'Rajasthan'],
  ['Ludhiana', 'Punjab'],
  ['Jalandhar', 'Punjab'],
  ['Jammu', 'Jammu and Kashmir'],
  ['Pondicherry', 'Puducherry'],
  ['Siliguri', 'West Bengal'],
  ['Durgapur', 'West Bengal'],
  ['Cuttack', 'Odisha'],
  ['Rourkela', 'Odisha'],
  ['Gandhinagar', 'Gujarat'],
  ['Anand', 'Gujarat'],
  ['Panaji', 'Goa'],
  ['Mussoorie', 'Uttarakhand'],
  ['Nainital', 'Uttarakhand'],
  ['Darjeeling', 'West Bengal'],
  ['Gangtok', 'Sikkim'],
  ['Shillong', 'Meghalaya'],
  ['Imphal', 'Manipur'],
  ['Aizawl', 'Mizoram'],
  ['Kohima', 'Nagaland'],
  ['Itanagar', 'Arunachal Pradesh'],
  ['Agartala', 'Tripura'],
  ['Port Blair', 'Andaman and Nicobar Islands'],
];

const AIRPORTS = [
  ['del-airport', 'Indira Gandhi International Airport', 'Delhi', 'delhi'],
  ['bom-airport', 'Chhatrapati Shivaji Maharaj International Airport', 'Maharashtra', 'mumbai'],
  ['blr-airport', 'Kempegowda International Airport', 'Karnataka', 'bangalore'],
  ['hyd-airport', 'Rajiv Gandhi International Airport', 'Telangana', 'hyderabad'],
  ['maa-airport', 'Chennai International Airport', 'Tamil Nadu', 'chennai'],
  ['ccu-airport', 'Netaji Subhas Chandra Bose International Airport', 'West Bengal', 'kolkata'],
  ['amd-airport', 'Sardar Vallabhbhai Patel International Airport', 'Gujarat', 'ahmedabad'],
  ['pnq-airport', 'Pune Airport', 'Maharashtra', 'pune'],
];

const INTENTS = [
  ['corporate-bus-rental', 'Corporate Bus Rental', 'corporate', 'corporate-bus-rental', ''],
  ['employee-transportation', 'Employee Transportation', 'corporate', 'employee-transportation', ''],
  ['corporate-fleet', 'Corporate Fleet', 'corporate', 'corporate-fleet', ''],
  ['corporate-mobility', 'Corporate Mobility', 'corporate', 'corporate-mobility', ''],
  ['airport-transfers', 'Airport Transfers', 'service', 'airport-transfers', ''],
  ['luxury-bus-rental', 'Luxury Bus Rental', 'service', 'luxury-bus-rental', 'luxury-bus'],
  ['urbania-rental', 'Urbania Rental', 'vehicle', 'urbania-rental', 'urbania'],
  ['cab-rental', 'Cab Rental', 'vehicle', 'cab-rental', 'cab'],
  ['tempo-traveller-rental', 'Tempo Traveller Rental', 'vehicle', 'tempo-traveller-rental', 'tempo-traveller'],
  ['executive-travel', 'Executive Travel', 'corporate', 'executive-travel', ''],
  ['government-transportation', 'Government Transportation', 'industry', 'government-transportation', ''],
  ['factory-transportation', 'Factory Transportation', 'industry', 'factory-transportation', ''],
  ['industrial-transportation', 'Industrial Transportation', 'industry', 'industrial-transportation', ''],
  ['school-transportation', 'School Transportation', 'industry', 'school-transportation', ''],
  ['hospital-transportation', 'Hospital Transportation', 'industry', 'hospital-transportation', ''],
  ['mining-transportation', 'Mining Transportation', 'industry', 'mining-transportation', ''],
  ['oil-gas-transportation', 'Oil & Gas Transportation', 'industry', 'oil-gas-transportation', ''],
  ['airport-crew-transportation', 'Airport Crew Transportation', 'industry', 'airport-crew-transportation', ''],
  ['foreign-delegates-transportation', 'Foreign Delegates Transportation', 'industry', 'foreign-delegates-transportation', ''],
  ['vip-transportation', 'VIP Transportation', 'corporate', 'vip-transportation', ''],
  ['hotel-transportation', 'Hotel Transportation', 'industry', 'hotel-transportation', ''],
  ['tourist-transportation', 'Tourist Transportation', 'industry', 'tourist-transportation', ''],
];

const NEARBY = {
  delhi: ['noida', 'gurgaon', 'faridabad', 'ghaziabad', 'agra'],
  mumbai: ['thane', 'pune', 'nashik'],
  bangalore: ['mysore', 'chennai', 'hyderabad'],
  hyderabad: ['bangalore', 'vijayawada', 'warangal'],
  chennai: ['bangalore', 'coimbatore', 'pondicherry'],
  pune: ['mumbai', 'nashik', 'aurangabad'],
  ahmedabad: ['vadodara', 'surat', 'rajkot', 'gandhinagar'],
  kolkata: ['siliguri', 'bhubaneswar', 'durgapur'],
  jaipur: ['ajmer', 'udaipur', 'delhi'],
  chandigarh: ['shimla', 'dehradun', 'amritsar'],
};

async function upsertCity(name, stateName, tier) {
  const slug = slugify(name);
  const existing = await SeoLocation.findOne({ slug }).lean();
  const nextTier = existing ? Math.min(existing.tier || 3, tier) : tier;
  const nearbyCitySlugs = NEARBY[slug] || existing?.nearbyCitySlugs || [];
  const airport = AIRPORTS.find((a) => a[3] === slug);
  const data = enrichCityDefaults({
    type: 'city',
    slug,
    name: existing?.name || name,
    stateName: existing?.stateName && existing.stateName !== 'India' ? existing.stateName : stateName,
    tier: nextTier,
    country: 'India',
    status: 'published',
    nearbyCitySlugs,
    nearbyAirportSlugs: airport ? [airport[0]] : existing?.nearbyAirportSlugs || [],
    touristPlaces: existing?.touristPlaces?.length
      ? existing.touristPlaces
      : [
          { name: `${name} city centre`, blurb: `Popular pickup zone for groups visiting ${name}.` },
          { name: `${name} business district`, blurb: `Corporate meeting and shuttle demand hotspot.` },
        ],
    corporateHubs: existing?.corporateHubs?.length
      ? existing.corporateHubs
      : [
          {
            name: `${name} IT / business parks`,
            blurb: `Employee transportation and corporate fleet demand.`,
            href: '/corporate/employee-transportation',
          },
        ],
    popularRoutes: existing?.popularRoutes?.length
      ? existing.popularRoutes
      : [
          {
            fromLabel: name,
            toLabel: 'Airport',
            href: airport ? `/airports/${airport[0]}` : '/book',
            notes: 'Flight-aware transfers',
          },
          {
            fromLabel: name,
            toLabel: 'Nearby city',
            href: nearbyCitySlugs[0] ? `/${nearbyCitySlugs[0]}-bus-rental` : '/book',
            notes: 'Intercity coach',
          },
        ],
    mapEmbed: existing?.mapEmbed?.embedUrl
      ? existing.mapEmbed
      : {
          label: name,
          embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(name + ' ' + stateName)}&output=embed`,
        },
  });
  await SeoLocation.findOneAndUpdate({ slug }, data, { upsert: true, new: true });
  return slug;
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected');

  await SeoSiteSettings.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      canonicalHost: 'https://www.luxurybusrental.in',
      siteName: 'Luxury Bus Rental',
      twitterHandle: '@LuxuryBusRental',
    },
    { upsert: true },
  );

  await BlogAuthor.findOneAndUpdate(
    { slug: 'luxury-bus-editorial' },
    {
      name: 'Luxury Bus Editorial',
      slug: 'luxury-bus-editorial',
      bio: 'Transportation marketplace insights for India corporates and travellers.',
      role: 'Editor',
      status: 'active',
    },
    { upsert: true },
  );

  await ContentTemplate.findOneAndUpdate(
    { key: 'premium-service' },
    {
      key: 'premium-service',
      name: 'Premium Service Landing',
      contentType: 'service',
      sectionDefs: [
        { key: 'hero', label: 'Hero', required: true },
        { key: 'overview', label: 'Overview', required: true, minWords: 200 },
        { key: 'benefits', label: 'Benefits', required: true },
        { key: 'faqs', label: 'FAQs', required: true },
      ],
      seoTitleTemplate: '{Title} India | Luxury Bus Rental',
      seoDescriptionTemplate: '{Description}',
      keywordTemplates: ['{Title}', '{Title} India', 'bus rental'],
      schemaTypes: ['Service', 'FAQPage', 'BreadcrumbList'],
      uniqueBlockKeys: ['overview', 'localDifferentiator'],
      status: 'active',
    },
    { upsert: true },
  );

  await ContentTemplate.findOneAndUpdate(
    { key: 'city-hub' },
    {
      key: 'city-hub',
      name: 'City SEO Hub',
      contentType: 'city',
      seoTitleTemplate: 'Bus Rental in {City} | Luxury Bus Rental',
      seoDescriptionTemplate: 'Book bus rental in {City}. Corporate, airport, Urbania and luxury coaches.',
      keywordTemplates: ['bus rental {City}', '{City} luxury bus'],
      schemaTypes: ['LocalBusiness', 'FAQPage', 'BreadcrumbList'],
      uniqueBlockKeys: ['cityIntro', 'localIndustries'],
      status: 'active',
    },
    { upsert: true },
  );

  // Bulk first, then priority/extra so Tier-1 metadata wins
  try {
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, resolve } = await import('path');
    const here = dirname(fileURLToPath(import.meta.url));
    const bulkPath = resolve(here, 'data/indiaCitiesFromFrontend.json');
    const bulk = JSON.parse(readFileSync(bulkPath, 'utf8'));
    for (const name of bulk) {
      await upsertCity(name, 'India', 3);
    }
  } catch (e) {
    console.warn('Bulk city import skipped:', e.message);
  }

  for (const [name, state] of EXTRA_CITIES) await upsertCity(name, state, 2);
  for (const [name, state, tier] of PRIORITY) await upsertCity(name, state, tier);

  for (const [slug, name, stateName, citySlug] of AIRPORTS) {
    await SeoLocation.findOneAndUpdate(
      { slug },
      {
        type: 'airport',
        slug,
        name,
        stateName,
        tier: 1,
        status: 'published',
        description: `${name} airport transfers and crew transportation with Luxury Bus Rental India.`,
        metaTitle: `${name} Transfers | Airport Bus & Cab Rental`,
        metaDescription: `Airport transfers at ${name}. Coaches, Urbania, Tempo Traveller and executive cabs.`,
        canonicalPath: `/airports/${slug}`,
        nearbyCitySlugs: [citySlug],
        relatedServiceSlugs: ['airport-transfers', 'airport-crew-transportation'],
      },
      { upsert: true },
    );
  }

  for (const [slug, name, intentType, servicePageSlug, vehicleTypeSlug] of INTENTS) {
    await SeoIntent.findOneAndUpdate(
      { slug },
      {
        slug,
        name,
        intentType,
        servicePageSlug,
        vehicleTypeSlug,
        minTier: intentType === 'vehicle' ? 2 : 1,
        status: 'active',
        h1Template: '{Intent} in {City}',
        titleTemplate: '{Intent} in {City} | Luxury Bus Rental India',
        descriptionTemplate:
          'Book {Intent} in {City}, {State}. Verified vendors, transparent quotes, corporate invoicing.',
        keywordTemplates: ['{Intent} {City}', '{Intent} in {City}', 'bus rental {City}'],
        faqTemplates: [
          {
            question: 'How do I book {Intent} in {City}?',
            answer: 'Share trip details on our booking form to receive quotes for {Intent} in {City}.',
          },
          {
            question: 'Is {Intent} available for long-term contracts in {City}?',
            answer: 'Yes. Enterprises can request monthly or annual mobility contracts in {City}.',
          },
        ],
      },
      { upsert: true },
    );
  }

  const redirects = [
    ['/corporate/employee-transportation-services', '/corporate/employee-transportation'],
    ['/industries/airport-transportation', '/corporate/airport-transfers'],
    ['/services/airport-shuttle-services', '/corporate/airport-transfers'],
  ];
  for (const [fromPath, toPath] of redirects) {
    await SeoRedirect.findOneAndUpdate({ fromPath }, { fromPath, toPath, statusCode: 301, enabled: true }, { upsert: true });
  }

  const intents = await SeoIntent.find({ status: 'active' }).lean();
  const tier1 = await SeoLocation.find({ type: 'city', status: 'published', tier: 1 }).lean();
  let prog = 0;
  for (const intent of intents) {
    for (const loc of tier1) {
      const doc = renderProgrammaticFromIntent(intent, loc);
      await ProgrammaticSeoPage.findOneAndUpdate(
        { intentSlug: intent.slug, locationSlug: loc.slug },
        doc,
        { upsert: true },
      );
      prog += 1;
    }
  }

  const cityCount = await SeoLocation.countDocuments({ type: 'city' });
  console.log(`Seeded cities=${cityCount}, programmatic=${prog}, intents=${intents.length}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
