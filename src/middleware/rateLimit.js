import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({ windowMs: 60000, max: 300, standardHeaders: true, legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many auth requests. Please try again later.' } });
export const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many payment requests. Please try again later.' } });
