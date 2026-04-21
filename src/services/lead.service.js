import { Lead } from '../models/Lead.js';
import { Vendor } from '../models/Vendor.js';
export const createLead = async (payload, authUser = null) => {
  const lead = await Lead.create({ customerId: authUser?.sub || null, ...payload });
  const vendors = await Vendor.find({
    status: 'active',
    $or: [{ city: new RegExp(payload.pickup, 'i') }, { operatingCities: new RegExp(payload.pickup, 'i') }],
  }).select('_id companyName city');
  return { ok: true, leadId: String(lead._id), notifiedVendors: vendors.length };
};
