import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { env } from '../config/env.js';
cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });
export const uploadBufferToCloudinary = (buffer, folder = 'luxurybus') => new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => error ? reject(error) : resolve(result)); streamifier.createReadStream(buffer).pipe(stream); });
export const destroyFromCloudinary = (publicId) => cloudinary.uploader.destroy(publicId);
