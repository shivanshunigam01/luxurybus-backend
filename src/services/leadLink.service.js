import { Lead } from '../models/Lead.js';

/** Attach guest-submitted leads to a customer account by email or phone. */
export const linkGuestLeadsToUser = async (userId, { email, phone } = {}) => {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const phone10 = String(phone || '').replace(/\D/g, '').slice(-10);
  const or = [];
  if (normalizedEmail) or.push({ guestEmail: normalizedEmail });
  if (phone10.length === 10) or.push({ guestPhone: new RegExp(`${phone10}$`) });
  if (!or.length) return { linked: 0 };

  const result = await Lead.updateMany({ customerId: null, $or: or }, { $set: { customerId: userId } });
  return { linked: result.modifiedCount ?? 0 };
};
