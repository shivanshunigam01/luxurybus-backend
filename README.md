# Luxury Bus Rental Backend

Production-ready MVC backend scaffold for the Luxury Bus Rental marketplace.

## Features
- JWT auth + Google OAuth
- Customer, vendor, B2B, and admin flows
- Leads, quotes, bookings, payments, reviews, settings
- Vehicle type catalog, Service/Corporate/Industry pages, Blog CMS, Site FAQs
- Public content API (`/api/public/*`)
- Razorpay order + verify + webhook
- Cloudinary upload integration
- Zod validation, helmet, rate limiting, CORS
- Enterprise: SEO platform, offers/coupons, maps/fare, PDF invoices/vouchers, analytics, payouts, notifications

## Docs
- **[Today’s feature + complete flows](docs/TODAY_FEATURE_DOCUMENTATION.md)** — end-to-end frontend + backend (4 Aug 2026)
- [API](docs/API.md) · [Admin](docs/ADMIN.md) · [Vendor](docs/VENDOR.md) · [B2B](docs/B2B.md) · [SEO](docs/SEO.md)

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```

## Seed
```bash
npm run seed:admin
npm run seed:platform
```

`seed:platform` upserts vehicle types, 18 corporate + 23 industry + featured service pages, blog taxonomy/posts, and homepage FAQs.
