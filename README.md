# Luxury Bus Rental Backend

Production-ready MVC backend scaffold for the Luxury Bus Rental marketplace.

## Features
- JWT auth + Google OAuth
- Customer, vendor, and admin flows
- Leads, quotes, bookings, payments, reviews, settings
- Vehicle type catalog, Service/Corporate/Industry pages, Blog CMS, Site FAQs
- Public content API (`/api/public/*`)
- Razorpay order + verify + webhook
- Cloudinary upload integration
- Zod validation, helmet, rate limiting, CORS

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
