import { env } from '../config/env.js';
import { cached } from '../utils/cache.js';
import { ApiError } from '../utils/ApiError.js';

const toRad = (d) => (Number(d) * Math.PI) / 180;

export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

/** Free OpenStreetMap Nominatim geocoding (no API key). */
export const geocodePlace = async (query) => {
  const q = String(query || '').trim();
  if (!q) throw new ApiError(400, 'Location query required');
  return cached(`geo:${q.toLowerCase()}`, 24 * 60 * 60 * 1000, async () => {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'in');
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LuxuryBusRental/1.0 (enterprise maps)' },
    });
    if (!res.ok) throw new ApiError(502, 'Geocoding provider unavailable');
    const data = await res.json();
    if (!data?.[0]) throw new ApiError(404, `Location not found: ${q}`);
    return {
      label: data[0].display_name,
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
      provider: 'nominatim',
    };
  });
};

export const routeDistance = async ({ origin, destination }) => {
  if (!origin || !destination) throw new ApiError(400, 'origin and destination required');

  const cacheKey = `route:${String(origin).toLowerCase()}|${String(destination).toLowerCase()}`;
  return cached(cacheKey, 6 * 60 * 60 * 1000, async () => {
    const [from, to] = await Promise.all([geocodePlace(origin), geocodePlace(destination)]);
    const distanceKm = haversineKm(from.lat, from.lng, to.lat, to.lng);
    const durationMinutes = Math.max(20, Math.round((distanceKm / 45) * 60));
    return {
      origin: from.label,
      destination: to.label,
      originCoords: { lat: from.lat, lng: from.lng },
      destinationCoords: { lat: to.lat, lng: to.lng },
      distanceKm,
      durationMinutes,
      distanceText: `${distanceKm} km`,
      durationText: `${durationMinutes} mins`,
      provider: 'nominatim+haversine',
    };
  });
};

export const estimateFare = async ({ origin, destination, busType = '', days = 1, passengers = 1 }) => {
  const route = await routeDistance({ origin, destination });
  const dayCount = Math.max(1, Number(days) || 1);
  const typeMult =
    /volvo|luxury|coach/i.test(busType) ? 1.35 : /urbania|tempo/i.test(busType) ? 1.1 : /cab|sedan|suv|innova/i.test(busType) ? 0.55 : 1;
  const base = env.FARE_BASE_INR * typeMult;
  const kmCharge = route.distanceKm * env.FARE_PER_KM_INR * typeMult;
  const dayCharge = (dayCount - 1) * env.FARE_PER_DAY_INR * typeMult;
  const paxBump = passengers > 20 ? 1.08 : passengers > 12 ? 1.04 : 1;
  const subtotal = Math.round((base + kmCharge + dayCharge) * paxBump);
  const gstAmount = Math.round(subtotal * 0.18);
  return {
    route,
    busType: busType || 'standard',
    days: dayCount,
    passengers,
    estimate: {
      subtotal,
      gstAmount,
      total: subtotal + gstAmount,
      currency: 'INR',
      breakdown: {
        base: Math.round(base),
        distance: Math.round(kmCharge),
        extraDays: Math.round(dayCharge),
        multiplier: typeMult,
      },
    },
  };
};
