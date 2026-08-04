import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { Lead } from '../models/Lead.js';
import { B2BCompany } from '../models/B2BCompany.js';
import { Bus } from '../models/Bus.js';
import { Invoice } from '../models/Invoice.js';
import { Driver } from '../models/Driver.js';
import { Offer } from '../models/Offer.js';

export const globalSearch = async (q, { limit = 8 } = {}) => {
  const term = String(q || '').trim();
  if (term.length < 2) return { q: term, groups: [] };
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const isId = /^[a-f0-9]{24}$/i.test(term);

  const [bookings, users, vendors, leads, companies, buses, invoices, drivers, offers] = await Promise.all([
    Booking.find(isId ? { _id: term } : { searchText: rx }).sort({ createdAt: -1 }).limit(limit).populate('leadId').lean(),
    User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }).limit(limit).lean(),
    Vendor.find({ $or: [{ companyName: rx }, { email: rx }, { phone: rx }, { city: rx }] }).limit(limit).lean(),
    Lead.find({ $or: [{ pickup: rx }, { drop: rx }, { guestName: rx }, { guestPhone: rx }, { guestEmail: rx }] })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    B2BCompany.find({ $or: [{ companyName: rx }, { email: rx }, { gstin: rx }, { phone: rx }] }).limit(limit).lean(),
    Bus.find({ $or: [{ name: rx }, { registrationNumber: rx }, { type: rx }] }).limit(limit).lean(),
    Invoice.find({ $or: [{ number: rx }, ...(isId ? [{ _id: term }, { bookingId: term }] : [])] })
      .limit(limit)
      .lean(),
    Driver.find({ $or: [{ name: rx }, { phone: rx }, { licenseNumber: rx }] }).limit(limit).lean(),
    Offer.find({ $or: [{ title: rx }, { code: rx }, { slug: rx }] }).limit(limit).lean(),
  ]);

  const groups = [
    {
      type: 'bookings',
      label: 'Bookings',
      items: bookings.map((b) => ({
        id: String(b._id),
        title: `Booking …${String(b._id).slice(-8)}`,
        subtitle: `${b.leadId?.pickup || ''} → ${b.leadId?.drop || ''} · ${b.rawStatus}`,
        href: `/admin/bookings`,
      })),
    },
    {
      type: 'leads',
      label: 'Leads',
      items: leads.map((l) => ({
        id: String(l._id),
        title: `${l.pickup} → ${l.drop}`,
        subtitle: l.guestName || l.guestPhone || l.journeyDate,
        href: `/admin/quotes`,
      })),
    },
    {
      type: 'vendors',
      label: 'Vendors',
      items: vendors.map((v) => ({
        id: String(v._id),
        title: v.companyName,
        subtitle: `${v.city || ''} · ${v.status}`,
        href: `/admin/vendors`,
      })),
    },
    {
      type: 'companies',
      label: 'B2B Companies',
      items: companies.map((c) => ({
        id: String(c._id),
        title: c.companyName,
        subtitle: `${c.status} · ${c.gstin || c.email}`,
        href: `/admin/companies`,
      })),
    },
    {
      type: 'users',
      label: 'Users',
      items: users.map((u) => ({
        id: String(u._id),
        title: u.name,
        subtitle: `${u.email} · ${u.role}`,
        href: `/admin/customers`,
      })),
    },
    {
      type: 'fleet',
      label: 'Fleet',
      items: buses.map((b) => ({
        id: String(b._id),
        title: b.name || b.registrationNumber || 'Bus',
        subtitle: `${b.type || ''} · ${b.registrationNumber || ''}`,
        href: `/admin/vendors`,
      })),
    },
    {
      type: 'drivers',
      label: 'Drivers',
      items: drivers.map((d) => ({
        id: String(d._id),
        title: d.name,
        subtitle: `${d.phone} · ${d.status}`,
        href: `/admin/drivers`,
      })),
    },
    {
      type: 'invoices',
      label: 'Invoices',
      items: invoices.map((i) => ({
        id: String(i._id),
        title: i.number,
        subtitle: `₹${i.total} · ${i.status}`,
        href: `/admin/companies`,
      })),
    },
    {
      type: 'offers',
      label: 'Offers',
      items: offers.map((o) => ({
        id: String(o._id),
        title: o.title,
        subtitle: `${o.type} ${o.code || ''} · ${o.status}`,
        href: `/admin/offers`,
      })),
    },
  ].filter((g) => g.items.length);

  return { q: term, groups, total: groups.reduce((s, g) => s + g.items.length, 0) };
};
