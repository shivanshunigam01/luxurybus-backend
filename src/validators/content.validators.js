import { z } from 'zod';
import { VEHICLE_CATEGORIES } from '../constants/vehicleTypes.js';

const jsonish = (schema) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      const t = val.trim();
      if (!t) return undefined;
      try {
        return JSON.parse(t);
      } catch {
        if (t.includes(',')) return t.split(',').map((s) => s.trim()).filter(Boolean);
        return val;
      }
    }
    return val;
  }, schema);

const boolish = z.preprocess((v) => {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return v;
}, z.boolean().optional());

const mediaSchema = jsonish(
  z
    .object({
      url: z.string().optional().default(''),
      publicId: z.string().optional().default(''),
      alt: z.string().optional().default(''),
    })
    .optional(),
);

const faqItem = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const linkItem = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const stringArray = jsonish(z.array(z.string()).optional());
const faqArray = jsonish(z.array(faqItem).optional());
const linkArray = jsonish(z.array(linkItem).optional());
const mediaArray = jsonish(z.array(mediaSchema).optional());
const idArray = jsonish(z.array(z.string()).optional());

export const vehicleTypeBodySchema = z.object({
  body: z.object({
    slug: z.string().min(1).optional(),
    name: z.string().min(1),
    category: z.enum(VEHICLE_CATEGORIES).optional(),
    seatsMin: z.coerce.number().optional(),
    seatsMax: z.coerce.number().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    featured: boolish,
    sortOrder: z.coerce.number().optional(),
    status: z.enum(['active', 'hidden']).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const vehicleTypeUpdateSchema = z.object({
  body: vehicleTypeBodySchema.shape.body.partial(),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});

export const servicePageBodySchema = z.object({
  body: z.object({
    title: z.string().min(1),
    slug: z.string().min(1).optional(),
    category: z.enum(['service', 'corporate', 'industry']),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    banner: mediaSchema,
    gallery: mediaArray,
    vehicleTypeSlugs: stringArray,
    citySlugs: stringArray,
    benefits: stringArray,
    whyChooseUs: stringArray,
    faqs: faqArray,
    cta: jsonish(z.object({ label: z.string().optional(), href: z.string().optional() }).optional()),
    internalLinks: linkArray,
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: stringArray,
    canonicalPath: z.string().optional(),
    ogImage: z.string().optional(),
    robots: z.string().optional(),
    status: z.enum(['draft', 'published', 'hidden']).optional(),
    featured: boolish,
    sortOrder: z.coerce.number().optional(),
    publishedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const servicePageUpdateSchema = z.object({
  body: servicePageBodySchema.shape.body.partial(),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});

export const blogCategoryBodySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'hidden']).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const blogCategoryUpdateSchema = z.object({
  body: blogCategoryBodySchema.shape.body.partial(),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});

export const blogTagBodySchema = blogCategoryBodySchema;
export const blogTagUpdateSchema = blogCategoryUpdateSchema;

export const blogPostBodySchema = z.object({
  body: z.object({
    title: z.string().min(1),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string().optional(),
    author: jsonish(
      z
        .object({
          name: z.string().optional(),
          avatarUrl: z.string().optional(),
        })
        .optional(),
    ),
    categoryIds: idArray,
    tagIds: idArray,
    featuredImage: mediaSchema,
    gallery: mediaArray,
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: stringArray,
    canonicalPath: z.string().optional(),
    ogImage: z.string().optional(),
    robots: z.string().optional(),
    readTimeMinutes: z.coerce.number().optional(),
    status: z.enum(['draft', 'published', 'scheduled', 'hidden']).optional(),
    scheduledAt: z.union([z.string(), z.date(), z.null()]).optional(),
    publishedAt: z.union([z.string(), z.date(), z.null()]).optional(),
    relatedPostIds: idArray,
    featured: boolish,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const blogPostUpdateSchema = z.object({
  body: blogPostBodySchema.shape.body.partial(),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});

export const siteFaqBodySchema = z.object({
  body: z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    group: z.enum(['home', 'general']).optional(),
    sortOrder: z.coerce.number().optional(),
    status: z.enum(['active', 'hidden']).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const siteFaqUpdateSchema = z.object({
  body: siteFaqBodySchema.shape.body.partial(),
  params: z.object({ id: z.string().min(8) }),
  query: z.object({}).optional(),
});

export const slugParamSchema = z.object({
  body: z.object({}).passthrough().optional(),
  params: z.object({ slug: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const busCreateSchema = z.object({
  body: z.object({
    registrationNumber: z.string().min(1),
    busType: z.string().min(1).optional(),
    vehicleTypeSlug: z.string().min(1).optional(),
    seats: z.coerce.number().positive(),
    ac: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === 'true' || v === '1'),
    pricingPerKm: z.coerce.number().optional(),
    pricingPerDay: z.coerce.number().optional(),
    availability: z.string().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
