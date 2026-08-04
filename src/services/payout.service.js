import { VendorPayout } from '../models/VendorPayout.js';
import { Booking } from '../models/Booking.js';
import { Vendor } from '../models/Vendor.js';
import { VendorWalletTransaction } from '../models/VendorWalletTransaction.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { ApiError } from '../utils/ApiError.js';
import { formatInr } from '../utils/formatters.js';
import { appendBookingEvent } from './bookingLifecycle.service.js';

const bankFromVendor = (v) => ({
  bankHolder: v.bankHolder || '',
  bankAccount: v.bankAccount || '',
  bankIfsc: v.bankIfsc || '',
  bankName: v.bankName || '',
});

const notifyVendorPayout = async (vendor, subject, body) => {
  await NotificationLog.create({
    recipientType: 'vendor',
    recipientId: vendor._id,
    channel: 'email',
    subject,
    body,
    message: body,
    status: 'sent',
  });
};

export const vendorRequestPayout = async (vendorId, body = {}) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  let bookingIds = body.bookingIds || [];
  let amountRequested = Number(body.amountRequested || 0);
  if (!bookingIds.length) {
    const ready = await Booking.find({ vendorId, payoutStatus: 'ready' }).lean();
    bookingIds = ready.map((b) => b._id);
    amountRequested = ready.reduce((s, b) => s + Number(b.payoutAmount || 0), 0);
  }
  if (!bookingIds.length || amountRequested <= 0) throw new ApiError(400, 'No ready payouts');
  const payout = await VendorPayout.create({
    vendorId,
    bookingIds,
    amountRequested,
    amountApproved: 0,
    status: 'pending',
    bankSnapshot: bankFromVendor(vendor),
  });
  await notifyVendorPayout(
    vendor,
    'Payout request submitted',
    `Your payout request of ${formatInr(amountRequested)} was submitted and is pending admin review.`,
  );
  return { ok: true, id: String(payout._id) };
};

export const vendorListPayouts = async (vendorId) => {
  const rows = await VendorPayout.find({ vendorId }).sort({ createdAt: -1 }).lean();
  return {
    payouts: rows.map((p) => ({
      id: String(p._id),
      amountRequested: p.amountRequested,
      amountApproved: p.amountApproved,
      amountRequestedDisplay: formatInr(p.amountRequested),
      amountApprovedDisplay: formatInr(p.amountApproved),
      status: p.status,
      transactionId: p.transactionId,
      remarks: p.remarks,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
      bankSnapshot: p.bankSnapshot,
    })),
  };
};

export const adminListPayouts = async (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.vendorId) filter.vendorId = query.vendorId;
  const rows = await VendorPayout.find(filter)
    .sort({ createdAt: -1 })
    .populate('vendorId', 'companyName email bankHolder bankAccount bankIfsc bankName')
    .lean();
  return {
    payouts: rows.map((p) => ({
      id: String(p._id),
      vendorId: p.vendorId?._id ? String(p.vendorId._id) : String(p.vendorId),
      vendor: p.vendorId?.companyName || 'Vendor',
      bookingIds: (p.bookingIds || []).map(String),
      amountRequested: p.amountRequested,
      amountApproved: p.amountApproved,
      amountRequestedDisplay: formatInr(p.amountRequested),
      amountApprovedDisplay: formatInr(p.amountApproved),
      status: p.status,
      remarks: p.remarks,
      transactionId: p.transactionId,
      bankSnapshot: p.bankSnapshot,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
    })),
  };
};

export const adminProcessPayout = async (id, body, adminUserId) => {
  const payout = await VendorPayout.findById(id);
  if (!payout) throw new ApiError(404, 'Payout not found');
  const vendor = await Vendor.findById(payout.vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const action = body.action || body.status;
  if (!['approve', 'reject', 'partial', 'paid', 'approved', 'rejected', 'partial'].includes(action)) {
    throw new ApiError(400, 'Invalid action');
  }

  payout.remarks = body.remarks != null ? body.remarks : payout.remarks;
  if (body.transactionId) payout.transactionId = body.transactionId;
  if (!payout.bankSnapshot?.bankAccount) payout.bankSnapshot = bankFromVendor(vendor);
  payout.processedBy = adminUserId;
  payout.processedAt = new Date();

  if (action === 'reject' || action === 'rejected') {
    payout.status = 'rejected';
    payout.amountApproved = 0;
    await payout.save();
    await notifyVendorPayout(vendor, 'Payout rejected', payout.remarks || 'Your payout request was rejected.');
    return { ok: true, status: payout.status };
  }

  if (action === 'approve' || action === 'approved') {
    payout.status = 'approved';
    payout.amountApproved = Number(body.amountApproved ?? payout.amountRequested);
    await payout.save();
    await notifyVendorPayout(
      vendor,
      'Payout approved',
      `Payout of ${formatInr(payout.amountApproved)} approved. Awaiting transfer.`,
    );
    return { ok: true, status: payout.status };
  }

  if (action === 'partial') {
    const amt = Number(body.amountApproved);
    if (!(amt > 0) || amt > payout.amountRequested) throw new ApiError(400, 'Invalid partial amount');
    payout.status = 'partial';
    payout.amountApproved = amt;
    await payout.save();
    await notifyVendorPayout(
      vendor,
      'Partial payout approved',
      `Partial payout of ${formatInr(amt)} approved against request ${formatInr(payout.amountRequested)}.`,
    );
    return { ok: true, status: payout.status };
  }

  // mark paid — credit wallet + booking payoutStatus
  const payAmount = Number(body.amountApproved ?? payout.amountApproved ?? payout.amountRequested);
  if (!(payAmount > 0)) throw new ApiError(400, 'Amount required to mark paid');
  if (!payout.transactionId && body.transactionId) payout.transactionId = body.transactionId;
  payout.amountApproved = payAmount;
  payout.status = 'paid';
  await payout.save();

  const bal = Number(vendor.walletBalance || 0) + payAmount;
  vendor.walletBalance = bal;
  await vendor.save();
  await VendorWalletTransaction.create({
    vendorId: vendor._id,
    type: 'payout',
    amount: payAmount,
    balanceAfter: bal,
    reference: payout.transactionId || String(payout._id),
    note: body.remarks || 'Payout credited',
    createdBy: adminUserId,
  });

  for (const bid of payout.bookingIds || []) {
    const booking = await Booking.findById(bid);
    if (booking && booking.payoutStatus !== 'paid') {
      booking.payoutStatus = 'paid';
      await booking.save();
      await appendBookingEvent({
        bookingId: booking._id,
        type: 'payment',
        message: `Vendor payout marked paid (UTR: ${payout.transactionId || 'n/a'})`,
        meta: { payoutId: String(payout._id), amount: payAmount },
        createdBy: adminUserId,
      });
    }
  }

  await notifyVendorPayout(
    vendor,
    'Payout paid',
    `Payout of ${formatInr(payAmount)} has been paid. UTR/Txn: ${payout.transactionId || '—'}.`,
  );
  return { ok: true, status: 'paid' };
};

export const adminExportPayoutsCsv = async (query = {}) => {
  const { payouts } = await adminListPayouts(query);
  const header = [
    'id',
    'vendor',
    'amountRequested',
    'amountApproved',
    'status',
    'transactionId',
    'bankHolder',
    'bankAccount',
    'bankIfsc',
    'createdAt',
    'processedAt',
  ];
  const lines = [header.join(',')];
  for (const p of payouts) {
    lines.push(
      [
        p.id,
        JSON.stringify(p.vendor),
        p.amountRequested,
        p.amountApproved,
        p.status,
        p.transactionId || '',
        JSON.stringify(p.bankSnapshot?.bankHolder || ''),
        JSON.stringify(p.bankSnapshot?.bankAccount || ''),
        p.bankSnapshot?.bankIfsc || '',
        p.createdAt ? new Date(p.createdAt).toISOString() : '',
        p.processedAt ? new Date(p.processedAt).toISOString() : '',
      ].join(','),
    );
  }
  return lines.join('\n');
};
