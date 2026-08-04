# Luxury Bus Backend — API Documentation

Base URL: `http://localhost:4000`  
Auth: `Authorization: Bearer <JWT>`

## Health
- `GET /health` — service status

## Auth `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Customer register |
| POST | `/b2b/register` | — | B2B company + user |
| POST | `/vendor/register` | — | Vendor register (OTP) |
| POST | `/login` | — | Login (any role) |
| POST | `/otp/send` | — | Send OTP |
| POST | `/otp/verify` | — | Verify OTP |
| GET | `/me` | yes | Current user |
| POST | `/google` | — | Google login |

## Public `/api/public`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/offers` | Active banners/coupons |
| POST | `/offers/validate-coupon` | Coupon engine validate |
| GET | `/maps/geocode?q=` | Geocode place |
| GET/POST | `/maps/distance` | Route distance |
| POST | `/maps/fare-estimate` | Fare estimation |
| GET | `/vehicle-types`, `/services`, `/blogs`, `/faqs`, `/reviews/featured`, `/fleet`, `/sitemap-urls` | CMS content |

## Customer `/api/customer` (role: customer)
Dashboard, bookings, quotes, reviews, profile, wishlist, saved-trips, notifications, trip voucher PDF (`/vouchers/:id/pdf`).

## Vendor `/api/vendor` (role: vendor)
Leads, quotes, fleet, earnings, payouts, drivers CRUD, assign-driver, schedule, calendar, deep analytics (`/analytics/deep`), notifications.

## B2B `/api/b2b` (role: b2b)
Dashboard, company, employees, bookings/trips, favourites, wallet, contracts, invoices, quote accept.

## Admin `/api/admin` (role: admin)
Stats, **analytics**, **global search**, **audit-logs**, **activity**, bookings (+ detail/timeline), vendors, companies, offers, payouts, drivers, calendar, CMS, settings, notifications (SMTP email broadcast).

## Enterprise `/api/enterprise`
Cross-role helpers: notifications, wishlist, saved-trips, maps (auth optional on public maps), PDF invoices/vouchers, admin search/analytics/audit.

## Payments `/api/payments`
Razorpay order + verify + webhook.

## PDF
- `GET /api/enterprise/invoices/:id/pdf` — GST invoice PDF
- `GET /api/enterprise/vouchers/:id/pdf` — Trip voucher PDF
- Also available under customer/vendor/admin paths where mounted

## Security
Helmet, CORS (production origin allowlist), rate limits, Zod validation, body sanitization, JWT roles, structured logging.

## Env (see `.env.example`)
SMTP (email OTP + notifications), OpenStreetMap Nominatim (geocode/distance), Razorpay, Cloudinary, fare rates.
