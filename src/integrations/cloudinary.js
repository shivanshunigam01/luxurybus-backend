import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

import { env } from '../config/env.js';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

export const isCloudinaryConfigured = () =>
  Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET &&
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
  const safeFolder = String(folder || 'misc').replace(/[^a-zA-Z0-9/_-]/g, '');
  const dir = path.join(uploadsRoot, safeFolder);
  await fs.promises.mkdir(dir, { recursive: true });
  const ext = path.extname(originalName || '').slice(0, 10) || '.bin';
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  const rel = `${safeFolder}/${filename}`.replace(/\\/g, '/');
  return {
    secure_url: `${publicBase()}/uploads/${rel}`,
    public_id: `local:${rel}`,
  };
};

export const uploadBufferToCloudinary = (
  buffer,
  folder = 'luxurybus',
  originalName = 'file',
) => {
  if (!buffer) return Promise.reject(new Error('File buffer missing'));
  if (!isCloudinaryConfigured()) {
    return saveLocal(buffer, folder, originalName);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const destroyFromCloudinary = async (publicId) => {
  if (!publicId) return;
  if (String(publicId).startsWith('local:')) {
    const rel = String(publicId).slice('local:'.length);
    await fs.promises.unlink(path.join(uploadsRoot, rel)).catch(() => null);
    return;
  }
  if (isCloudinaryConfigured()) {
    return cloudinary.uploader.destroy(publicId);
  }
};
