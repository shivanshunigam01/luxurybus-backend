import { Lead } from '../models/Lead.js';
import { Vendor } from '../models/Vendor.js';
import { User } from '../models/User.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { sendEmail } from '../integrations/mailer.js';
import { env } from '../config/env.js';

const summarizeLead = (lead, payload) =>
  [
    `Lead ID: ${lead._id}`,
    `Route: ${payload.pickup} -> ${payload.drop}`,
    `Journey date: ${payload.journeyDate} ${payload.journeyTime}`,
    `Passengers: ${payload.passengers}`,
    `Bus type: ${payload.busType || 'Not specified'}`,
    `Purpose: ${payload.purpose || 'Not specified'}`,
    `Contact name: ${payload.guestName || 'Not shared'}`,
    `Contact phone: ${payload.guestPhone || 'Not shared'}`,
    `Contact email: ${payload.guestEmail || 'Not shared'}`,
  ].join('\n');

const bookingEmailHtml = ({ title, subtitle, payload, leadId }) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f7ff;padding:24px">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d6e3ff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(30,77,205,0.12)">
      <div style="background:linear-gradient(120deg,#165dff,#3a8dff);color:#fff;padding:18px 22px">
        <div style="font-size:20px;font-weight:700;letter-spacing:.2px">Luxury Bus Rental</div>
        <div style="font-size:13px;opacity:.9;margin-top:4px">${subtitle}</div>
      </div>
      <div style="padding:20px 22px 8px 22px">
        <div style="font-size:18px;font-weight:700;color:#13326c;margin-bottom:10px">${title}</div>
        <div style="border:2px dashed #9dbdff;border-radius:12px;padding:14px;background:#f8fbff">
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e2a3a">
            <tr><td style="padding:6px 0;font-weight:700;width:40%">Lead ID</td><td style="padding:6px 0">${leadId}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Route</td><td style="padding:6px 0">${payload.pickup} -> ${payload.drop}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Journey Date</td><td style="padding:6px 0">${payload.journeyDate} ${payload.journeyTime}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Passengers</td><td style="padding:6px 0">${payload.passengers}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Bus Type</td><td style="padding:6px 0">${payload.busType || 'Not specified'}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Purpose</td><td style="padding:6px 0">${payload.purpose || 'Not specified'}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Contact Name</td><td style="padding:6px 0">${payload.guestName || 'Not shared'}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Contact Phone</td><td style="padding:6px 0">${payload.guestPhone || 'Not shared'}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700">Contact Email</td><td style="padding:6px 0">${payload.guestEmail || 'Not shared'}</td></tr>
          </table>
        </div>
      </div>
      <div style="padding:12px 22px 22px;color:#425466;font-size:13px">
        Our team and registered vendors will process this request and share quotations soon.
      </div>
    </div>
  </div>
`;

const logEmail = (recipientType, recipientId, subject, body, status) =>
  NotificationLog.create({
    recipientType,
    recipientId,
    channel: 'email',
    subject,
    body,
    audience: recipientType,
    status,
    message: subject,
  });

export const createLead = async (payload, authUser = null) => {
  const lead = await Lead.create({ customerId: authUser?.sub || null, ...payload });
  const vendors = await Vendor.find({
    status: 'active',
    $or: [{ city: new RegExp(payload.pickup, 'i') }, { operatingCities: new RegExp(payload.pickup, 'i') }],
  }).select('_id companyName city');

  const alertEmail = env.BOOKING_ALERT_EMAIL || 'kartartravelsltd@gmail.com';
  const vendorRecipients = [{ _id: null, email: alertEmail }];
  const vendorSubject = 'New booking request initiated by a user';
  const vendorBody = `A customer has initiated a new booking request.\n\n${summarizeLead(lead, payload)}\n\nPlease review and share your quotation.`;
  const vendorHtml = bookingEmailHtml({
    title: 'New Booking Request Initiated',
    subtitle: 'Vendor/Admin Alert',
    payload,
    leadId: String(lead._id),
  });

  await Promise.allSettled(
    vendorRecipients.map(async (vendor) => {
      try {
        const result = await sendEmail({ to: vendor.email, subject: vendorSubject, text: vendorBody, html: vendorHtml });
        await logEmail('vendor', vendor._id, vendorSubject, vendorBody, result.sent ? 'sent' : 'failed');
      } catch {
        await logEmail('vendor', vendor._id, vendorSubject, vendorBody, 'failed');
      }
    }),
  );

  const customerUser = authUser?.sub ? await User.findById(authUser.sub).select('_id email') : null;
  const customerEmail = payload.guestEmail || customerUser?.email || '';
  if (customerEmail) {
    const customerSubject = 'Booking request received - please wait for vendor quotations';
    const customerBody =
      `Your booking request has been received successfully.\n\n${summarizeLead(lead, payload)}\n\n` +
      'Our registered vendors will review your request and share quotations soon.';
    const customerHtml = bookingEmailHtml({
      title: 'Your booking request has been received successfully',
      subtitle: 'Customer Confirmation',
      payload,
      leadId: String(lead._id),
    });
    try {
      const result = await sendEmail({ to: customerEmail, subject: customerSubject, text: customerBody, html: customerHtml });
      await logEmail('customer', customerUser?._id || null, customerSubject, customerBody, result.sent ? 'sent' : 'failed');
    } catch {
      await logEmail('customer', customerUser?._id || null, customerSubject, customerBody, 'failed');
    }
  }

  return { ok: true, leadId: String(lead._id), notifiedVendors: vendorRecipients.length, matchedVendors: vendors.length };
};
