# B2B Corporate Portal Documentation

## Access
- Register: `/b2b/register` (company + contact). Legacy redirect: `/customer/b2b-register`
- Login: `/login?role=b2b`
- Demo (after `npm run seed:b2b`): `active.corp@demo.local` / `B2Bdemo@123`

## Approval flow
1. Company registers → status `pending`
2. Admin approves on `/admin/companies` → status `active`
3. Portal unlocks bookings, employees, wallet, contracts

## Modules
| Module | Route | API |
|--------|-------|-----|
| Dashboard | `/b2b/dashboard` | `GET /api/b2b/dashboard` |
| Bookings / Trips | `/b2b/bookings`, `/b2b/trips` | `/api/b2b/bookings`, `/trips` |
| Employees | `/b2b/employees` | invite creates `role:b2b` users |
| Favourites | `/b2b/favourites` | vehicle preferences |
| Wallet / Payments | `/b2b/wallet`, `/b2b/payments` | credit limit + payment history |
| Invoices | `/b2b/invoices` | GST invoices; PDF via enterprise invoice endpoint |
| Contracts | `/b2b/contracts` | read-only pricing agreements |

## Billing
- Corporate discount from company/contract settings
- Coupons via coupon engine (`CORP10` seeded)
- Invoices issued on confirmed/completed bookings (`LBR-INV-YYYY-######`)
