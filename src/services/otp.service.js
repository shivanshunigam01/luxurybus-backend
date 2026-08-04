import crypto from 'crypto';
import { Otp } from '../models/Otp.js';
import { ApiError } from '../utils/ApiError.js';
import { sendEmail } from '../integrations/mailer.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { env } from '../config/env.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const normalizeEmail = (target) => String(target || '').toLowerCase().trim();

export const sendOtp = async ({ channel, target, purpose = 'vendor_register' }) => {
  if (channel === 'sms') {
    throw new ApiError(400, 'SMS OTP is disabled. Please use email OTP.');
  }
  if (channel && channel !== 'email') throw new ApiError(400, 'Invalid OTP channel. Use email.');

  const normalized = normalizeEmail(target);
  if (!normalized.includes('@')) throw new ApiError(400, 'Valid email required');

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await Otp.deleteMany({ target: normalized, purpose, verified: false });
  await Otp.create({
    channel: 'email',
    target: normalized,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const message = `Your Luxury Bus Rental verification code is ${code}. Valid for 10 minutes.`;
  const delivery = await sendEmail({
    to: normalized,
    subject: 'Verification OTP — Luxury Bus Rental',
    text: message,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>Valid for 10 minutes.</p>`,
  });

  await NotificationLog.create({
    recipientType: 'guest',
    channel: 'email',
    subject: 'OTP',
    body: message,
    message: `OTP sent to ${normalized}`,
    audience: purpose,
    status: delivery.sent ? 'sent' : 'queued',
  });

  const payload = {
    ok: true,
    channel: 'email',
    target: normalized.replace(/(.{2}).+(@.+)/, '$1***$2'),
    expiresInSeconds: OTP_TTL_MS / 1000,
  };

  if (env.NODE_ENV !== 'production' && !delivery.sent) {
    payload.devCode = code;
  }
  return payload;
};

export const verifyOtp = async ({ channel: _channel, target, code, purpose = 'vendor_register' }) => {
  const normalized = normalizeEmail(target);
  if (!normalized.includes('@')) throw new ApiError(400, 'Valid email required');

  const row = await Otp.findOne({ target: normalized, purpose, verified: false }).sort({ createdAt: -1 });
  if (!row) throw new ApiError(400, 'OTP expired or not found. Request a new code.');
  if (row.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'OTP expired. Request a new code.');
  if (row.attempts >= MAX_ATTEMPTS) throw new ApiError(429, 'Too many attempts. Request a new OTP.');

  row.attempts += 1;
  if (row.codeHash !== hashCode(code)) {
    await row.save();
    throw new ApiError(400, 'Invalid OTP');
  }
  row.verified = true;
  await row.save();
  return { ok: true, verified: true, target: normalized, channel: 'email' };
};

export const assertOtpVerified = async ({ channel: _channel, target, purpose = 'vendor_register' }) => {
  const normalized = normalizeEmail(target);
  const recent = await Otp.findOne({
    target: normalized,
    purpose,
    verified: true,
    updatedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
  }).sort({ updatedAt: -1 });
  if (!recent) throw new ApiError(400, 'Please verify OTP via email before continuing');
  return true;
};
