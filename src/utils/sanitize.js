const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const stripHtml = (value) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL, '')
    .trim();

export const sanitizeString = (value, { max = 2000 } = {}) => stripHtml(value).slice(0, max);

export const sanitizeObject = (input, depth = 0) => {
  if (depth > 6 || input == null) return input;
  if (typeof input === 'string') return sanitizeString(input);
  if (Array.isArray(input)) return input.map((v) => sanitizeObject(v, depth + 1));
  if (typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = sanitizeObject(v, depth + 1);
    }
    return out;
  }
  return input;
};
