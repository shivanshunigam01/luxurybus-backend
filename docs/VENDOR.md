# Vendor Portal Documentation

## Access
- Register: `/vendor/register` (OTP + multi-step onboarding)
- Login: `/login?role=vendor`
- Shell: `/vendor/*`

## Modules
| Module | Route | Notes |
|--------|-------|-------|
| Dashboard | `/vendor/dashboard` | Live lead/booking KPIs |
| Analytics | `/vendor/analytics` | Performance cards; deep series via `/api/vendor/analytics/deep` |
| Fleet | `/vendor/fleet` | Buses, images, availability calendar JSON |
| Drivers | `/vendor/drivers` | Create/manage drivers |
| Calendar | `/vendor/calendar` | Upcoming trip assignments |
| Leads / Quotes / Bookings | respective routes | Accept/reject leads, quote, update trip status |
| Documents / Payments / Earnings | | KYC docs, wallet, payout request + history |
| Notifications | `/vendor/notifications` | In-app + emailed alerts |

## Key APIs
- `POST /api/vendor/drivers` — create driver
- `POST /api/vendor/bookings/:id/assign-driver` `{ driverId }` — assign + notify customer
- `POST /api/vendor/bookings/:id/schedule` — set journey date/time + bus
- `GET /api/vendor/calendar` — availability events
- `POST /api/vendor/payouts` — request payout for ready bookings
- `GET /api/vendor/vouchers/:id/pdf` — trip voucher

## Status flow
`pending_payment` → `confirmed` → `on_trip` → `completed` (payout ready) → admin payout paid
