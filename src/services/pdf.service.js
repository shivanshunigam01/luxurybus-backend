import PDFDocument from 'pdfkit';
import { Invoice } from '../models/Invoice.js';
import { Booking } from '../models/Booking.js';
import { Lead } from '../models/Lead.js';
import { Setting } from '../models/Setting.js';
import { B2BCompany } from '../models/B2BCompany.js';
import { Vendor } from '../models/Vendor.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { formatInr } from '../utils/formatters.js';

const bufferFromDoc = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

const companyHeader = async () => {
  const s = await Setting.findOne().sort({ createdAt: -1 }).lean();
  return {
    name: s?.companyName || 'Luxury Bus Rental',
    phone: s?.contactPhone || '',
    email: s?.contactEmail || '',
    gst: s?.gstNumber || '',
  };
};

export const buildGstInvoicePdf = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  const [settings, company, booking, customer, vendor] = await Promise.all([
    companyHeader(),
    invoice.companyId ? B2BCompany.findById(invoice.companyId).lean() : null,
    invoice.bookingId ? Booking.findById(invoice.bookingId).lean() : null,
    invoice.customerId ? User.findById(invoice.customerId).lean() : null,
    invoice.vendorId ? Vendor.findById(invoice.vendorId).lean() : null,
  ]);
  const lead = booking?.leadId ? await Lead.findById(booking.leadId).lean() : null;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.fontSize(18).text('TAX INVOICE / GST INVOICE', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).text(settings.name);
  doc.text(`GSTIN: ${settings.gst || invoice.gstinSeller || '—'}`);
  doc.text(`${settings.email} · ${settings.phone}`);
  doc.moveDown();
  doc.text(`Invoice No: ${invoice.number}`);
  doc.text(`Date: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('en-IN') : '—'}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown();
  doc.fontSize(12).text('Bill To', { underline: true });
  doc.fontSize(10);
  if (company) {
    doc.text(company.companyName);
    doc.text(`GSTIN: ${company.gstin || invoice.gstinBuyer || '—'}`);
    doc.text(company.email || '');
  } else {
    doc.text(customer?.name || lead?.guestName || 'Customer');
    doc.text(customer?.email || lead?.guestEmail || '');
    doc.text(`GSTIN: ${invoice.gstinBuyer || '—'}`);
  }
  doc.moveDown();
  if (lead) {
    doc.text(`Route: ${lead.pickup} → ${lead.drop}`);
    doc.text(`Journey: ${lead.journeyDate} ${lead.journeyTime || ''}`);
  }
  if (vendor) doc.text(`Operator: ${vendor.companyName}`);
  doc.moveDown();
  doc.fontSize(12).text('Line items', { underline: true });
  doc.fontSize(10);
  for (const line of invoice.lineItems || []) {
    doc.text(`${line.description || 'Service'} — ${formatInr(line.amount)}`);
  }
  doc.moveDown();
  doc.text(`Taxable: ${formatInr(invoice.taxable)}`);
  doc.text(`GST: ${formatInr(invoice.gstAmount)}`);
  doc.fontSize(12).text(`Total: ${formatInr(invoice.total)}`, { underline: true });
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#666').text('Computer generated GST invoice. Subject to platform terms.', { align: 'center' });

  const buffer = await bufferFromDoc(doc);
  return { buffer, filename: `${invoice.number}.pdf`, invoice };
};

export const buildTripVoucherPdf = async (bookingId) => {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw new ApiError(404, 'Booking not found');
  const [lead, vendor, customer, settings] = await Promise.all([
    Lead.findById(booking.leadId).lean(),
    Vendor.findById(booking.vendorId).lean(),
    User.findById(booking.customerId).lean(),
    companyHeader(),
  ]);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.fontSize(20).text('TRIP VOUCHER', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(settings.name, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Booking ID: ${String(booking._id)}`);
  doc.text(`Status: ${booking.displayStatus || booking.rawStatus}`);
  doc.text(`Customer: ${customer?.name || lead?.guestName || '—'}`);
  doc.text(`Phone: ${customer?.phone || lead?.guestPhone || '—'}`);
  doc.moveDown();
  doc.text(`Pickup: ${lead?.pickup || '—'}`);
  doc.text(`Drop: ${lead?.drop || '—'}`);
  doc.text(`Date/Time: ${lead?.journeyDate || ''} ${lead?.journeyTime || ''}`);
  doc.text(`Passengers: ${lead?.passengers || '—'}`);
  doc.moveDown();
  doc.text(`Operator: ${vendor?.companyName || '—'}`);
  doc.text(`Driver: ${booking.driver?.name || 'TBA'} (${booking.driver?.phone || '—'})`);
  doc.text(`Amount paid: ${formatInr(booking.amountPaid)}`);
  doc.text(`Trip total: ${formatInr(booking.totalWithGst)}`);
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#444').text('Please carry a valid ID. Present this voucher to the driver at pickup.', {
    align: 'center',
  });

  const buffer = await bufferFromDoc(doc);
  return { buffer, filename: `voucher-${String(bookingId).slice(-8)}.pdf`, booking };
};
