import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const isPlaceholderSecret = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return !v || /^(x+|changeme|change-me|your[_-]|placeholder|dummy|todo|secret)$/.test(v);
};

export const isCloudinaryConfigured = () =>
  Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET &&
      !isPlaceholderSecret(env.CLOUDINARY_CLOUD_NAME) &&
      !isPlaceholderSecret(env.CLOUDINARY_API_KEY) &&
      !isPlaceholderSecret(env.CLOUDINARY_API_SECRET) &&
      env.CLOUDINARY_CLOUD_NAME.length > 3 &&
      env.CLOUDINARY_API_KEY.length > 8 &&
      env.CLOUDINARY_API_SECRET.length > 8,
  );

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

const publicBase = () =>
  String(env.API_PUBLIC_URL || `http://127.0.0.1:${env.PORT}`).replace(/\/$/, '');

const saveLocal = async (buffer, folder, originalName = 'file') => {
  const parts = String(folder || 'misc')
    .split(/[/\\]+/)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean);
  const dir = path.join(uploadsRoot, ...parts);
  await fs.promises.mkdir(dir, { recursive: true });
  const ext = (path.extname(originalName || '').slice(0, 10) || '.bin').toLowerCase();
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  const rel = [...parts, filename].join('/');
  return {
    secure_url: `${publicBase()}/uploads/${rel}`,
    public_id: `local:${rel}`,
  };
};

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export const uploadBufferToCloudinary = async (
  buffer,
  folder = 'luxurybus',
  originalName = 'file',
) => {
  if (!buffer) throw new Error('File buffer missing');
  if (isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(buffer, folder);
    } catch (error) {
      logger.warn('cloudinary_upload_failed_using_local', { message: error?.message || String(error) });
    }
  }
  return saveLocal(buffer, folder, originalName);
};

export const destroyFromCloudinary = async (publicId) => {
  if (!publicId) return;
  if (String(publicId).startsWith('local:')) {
    const rel = String(publicId).slice('local:'.length);
    const parts = rel.split(/[/\\]+/).filter(Boolean);
    await fs.promises.unlink(path.join(uploadsRoot, ...parts)).catch(() => null);
    return;
  }
  if (isCloudinaryConfigured()) {
    return cloudinary.uploader.destroy(publicId);
  }
};
