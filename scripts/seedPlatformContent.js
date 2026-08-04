import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import { VehicleType } from '../src/models/VehicleType.js';
import { ServicePage } from '../src/models/ServicePage.js';
import { BlogCategory } from '../src/models/BlogCategory.js';
import { BlogTag } from '../src/models/BlogTag.js';
import { BlogPost } from '../src/models/BlogPost.js';
import { SiteFaq } from '../src/models/SiteFaq.js';
import { VEHICLE_TYPE_SEED } from '../src/constants/vehicleTypes.js';
import {
  CORPORATE_PAGES,
  INDUSTRY_PAGES,
  SERVICE_PAGES,
  BLOG_CATEGORIES,
  BLOG_TAGS,
  BLOG_POSTS,
  HOME_FAQS,
} from './data/platformContent.js';
import { estimateReadTime } from '../src/utils/slugify.js';

dotenv.config();

const upsertBySlug = async (Model, docs, label) => {
  let n = 0;
  for (const doc of docs) {
    await Model.findOneAndUpdate(
      { slug: doc.slug },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    n += 1;
  }
  console.log(`Upserted ${n} ${label}`);
};

connectDB()
  .then(async () => {
    await upsertBySlug(
      VehicleType,
      VEHICLE_TYPE_SEED.map((v) => ({
        ...v,
        description: v.description || `${v.name} for corporate and private hire across India.`,
        status: 'active',
        imageUrl: v.imageUrl || '',
        imagePublicId: '',
      })),
      'vehicle types',
    );

    const pages = [...SERVICE_PAGES, ...CORPORATE_PAGES, ...INDUSTRY_PAGES];
    await upsertBySlug(ServicePage, pages, 'service/corporate/industry pages');

    for (const cat of BLOG_CATEGORIES) {
      await BlogCategory.findOneAndUpdate({ slug: cat.slug }, { $set: cat }, { upsert: true, new: true });
    }
    console.log(`Upserted ${BLOG_CATEGORIES.length} blog categories`);

    for (const tag of BLOG_TAGS) {
      await BlogTag.findOneAndUpdate({ slug: tag.slug }, { $set: tag }, { upsert: true, new: true });
    }
    console.log(`Upserted ${BLOG_TAGS.length} blog tags`);

    const cats = await BlogCategory.find().lean();
    const tags = await BlogTag.find().lean();
    const catMap = Object.fromEntries(cats.map((c) => [c.slug, c._id]));
    const tagMap = Object.fromEntries(tags.map((t) => [t.slug, t._id]));

    const postIds = [];
    for (const post of BLOG_POSTS) {
      const payload = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        author: { name: 'Kartar Travels Editorial', avatarUrl: '' },
        categoryIds: (post.categorySlugs || []).map((s) => catMap[s]).filter(Boolean),
        tagIds: (post.tagSlugs || []).map((s) => tagMap[s]).filter(Boolean),
        featuredImage: { url: '', publicId: '', alt: post.title },
        gallery: [],
        metaTitle: `${post.title} | Luxury Bus Rental India`,
        metaDescription: post.excerpt,
        keywords: post.keywords || [],
        canonicalPath: `/blog/${post.slug}`,
        ogImage: '',
        robots: 'index,follow',
        readTimeMinutes: estimateReadTime(post.content),
        status: 'published',
        publishedAt: new Date(),
        featured: !!post.featured,
        relatedPostIds: [],
      };
      const saved = await BlogPost.findOneAndUpdate(
        { slug: post.slug },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      postIds.push(saved._id);
    }
    console.log(`Upserted ${BLOG_POSTS.length} blog posts`);

    // Wire simple related posts (next 2 in list)
    const allPosts = await BlogPost.find({ status: 'published' }).select('_id slug').lean();
    for (let i = 0; i < allPosts.length; i += 1) {
      const related = [allPosts[(i + 1) % allPosts.length]?._id, allPosts[(i + 2) % allPosts.length]?._id].filter(
        Boolean,
      );
      await BlogPost.updateOne({ _id: allPosts[i]._id }, { $set: { relatedPostIds: related } });
    }

    for (const faq of HOME_FAQS) {
      await SiteFaq.findOneAndUpdate(
        { question: faq.question, group: faq.group },
        { $set: faq },
        { upsert: true, new: true },
      );
    }
    console.log(`Upserted ${HOME_FAQS.length} FAQs`);

    console.log('Platform content seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
