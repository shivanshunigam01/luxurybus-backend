# Admin Portal Documentation

## Access
- Login: `/login?role=admin`
- Shell: `/admin/*`

## Modules
| Module | Route | Capabilities |
|--------|-------|--------------|
| Dashboard | `/admin/dashboard` | KPI cards, recent bookings |
| Analytics | `/admin/analytics` | Revenue/booking/lead charts, fleet & vendor analytics |
| Vendors | `/admin/vendors` | KYC, docs, fleet review, wallet |
| B2B Companies | `/admin/companies` | Approve/reject/suspend, credit, contracts |
| Customers | `/admin/customers` | User list / block |
| Bookings | `/admin/bookings` | Global filters, detail timeline, driver/payout controls |
| Drivers | `/admin/drivers` | Cross-vendor driver directory |
| Calendar | `/admin/calendar` | Trip schedule & availability |
| Quotes | `/admin/quotes` | Quote monitor |
| Payments / Payouts | `/admin/payments`, `/admin/payouts` | Refunds; approve/reject/partial/UTR/CSV |
| Offers | `/admin/offers` | Banner + coupon CMS |
| Audit logs | `/admin/audit-logs` | Security/action trail |
| Activity | `/admin/activity` | Booking event timeline |
| Content | CMS / services / blogs / FAQs / vehicle types | Platform content |
| Notifications | `/admin/notifications` | Broadcast email (SMTP) + logs |
| Settings | `/admin/settings` | GST, commission, payout rules |

## Global tools
- **⌘K / Ctrl+K** global search (bookings, vendors, leads, companies, invoices…)
- Notification bell + dark mode toggle in panel chrome

## Ops
```bash
npm run seed:admin
npm run seed:platform
npm run seed:b2b
npm run backup:db   # requires mongodump
```
