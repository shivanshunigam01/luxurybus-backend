export const toPublicUser = (user) => ({ id: String(user._id), email: user.email, name: user.name, phone: user.phone || '', role: user.role, vendorId: user.vendorId ? String(user.vendorId) : undefined });
export const money = (num) => Number(num || 0).toFixed(2);
/** Matches gobus-rentals `local-api` / UI copy (sentence case). */
export const formatInr = (num) => `₹${Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const displayStatusFromRaw = (raw) => {
  const map = { pending_payment: 'Pending payment', confirmed: 'Confirmed', on_trip: 'On Trip', completed: 'Completed', cancelled: 'Cancelled' };
  return map[raw] || raw;
};
export const paymentLabelFromBooking = (b) => {
  const paid = Number(b.amountPaid || 0);
  const total = Number(b.totalWithGst || 0);
  if (paid >= total - 0.01) return 'Paid in full';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
};
