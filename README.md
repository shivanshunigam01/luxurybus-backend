# Luxury Bus Rental Backend

Production-ready MVC backend scaffold for the Luxury Bus Rental marketplace.

## Features
- JWT auth + Google OAuth
- Customer, vendor, and admin flows
- Leads, quotes, bookings, payments, reviews, CMS, settings
- Razorpay order + verify + webhook
- Cloudinary upload integration
- Zod validation, helmet, rate limiting, CORS

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```

## Seed admin
```bash
npm run seed:admin
```
