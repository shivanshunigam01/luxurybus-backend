import { Wishlist } from '../models/Wishlist.js';
import { SavedTrip } from '../models/SavedTrip.js';
import { ApiError } from '../utils/ApiError.js';
import { routeDistance } from './maps.service.js';

export const listWishlist = async (userId) => {
  const rows = await Wishlist.find({ userId }).sort({ createdAt: -1 }).lean();
  return {
    items: rows.map((w) => ({
      id: String(w._id),
      vehicleTypeSlug: w.vehicleTypeSlug,
      busId: w.busId ? String(w.busId) : null,
      serviceSlug: w.serviceSlug,
      label: w.label,
      createdAt: w.createdAt,
    })),
  };
};

export const addWishlist = async (userId, body) => {
  if (!body.vehicleTypeSlug && !body.busId && !body.serviceSlug) {
    throw new ApiError(400, 'vehicleTypeSlug, busId, or serviceSlug required');
  }
  const w = await Wishlist.create({
    userId,
    vehicleTypeSlug: body.vehicleTypeSlug || '',
    busId: body.busId || null,
    serviceSlug: body.serviceSlug || '',
    label: body.label || body.vehicleTypeSlug || body.serviceSlug || 'Saved',
    meta: body.meta || {},
  });
  return { ok: true, id: String(w._id) };
};

export const removeWishlist = async (userId, id) => {
  await Wishlist.deleteOne({ _id: id, userId });
  return { ok: true };
};

export const listSavedTrips = async (userId) => {
  const rows = await SavedTrip.find({ userId }).sort({ createdAt: -1 }).lean();
  return {
    trips: rows.map((t) => ({
      id: String(t._id),
      title: t.title || `${t.pickup} → ${t.drop}`,
      pickup: t.pickup,
      drop: t.drop,
      distanceKm: t.distanceKm,
      passengers: t.passengers,
      busType: t.busType,
      notes: t.notes,
      createdAt: t.createdAt,
    })),
  };
};

export const saveTrip = async (userId, body) => {
  if (!body.pickup || !body.drop) throw new ApiError(400, 'pickup and drop required');
  let distanceKm = Number(body.distanceKm || 0);
  let coords = {};
  try {
    const route = await routeDistance({ origin: body.pickup, destination: body.drop });
    distanceKm = route.distanceKm;
    coords = {
      pickupLat: route.originCoords?.lat ?? null,
      pickupLng: route.originCoords?.lng ?? null,
      dropLat: route.destinationCoords?.lat ?? null,
      dropLng: route.destinationCoords?.lng ?? null,
    };
  } catch {
    // keep manual distance if geocode fails
  }
  const t = await SavedTrip.create({
    userId,
    companyId: body.companyId || null,
    title: body.title || '',
    pickup: body.pickup,
    drop: body.drop,
    ...coords,
    distanceKm,
    passengers: Number(body.passengers || 1),
    busType: body.busType || '',
    notes: body.notes || '',
  });
  return { ok: true, id: String(t._id), distanceKm };
};

export const deleteSavedTrip = async (userId, id) => {
  await SavedTrip.deleteOne({ _id: id, userId });
  return { ok: true };
};
