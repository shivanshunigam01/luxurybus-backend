import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  CLIENT_ORIGIN: z.string().default('http://localhost:8080'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(20),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() === 'true' : false), z.boolean()).default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default(''),
  BOOKING_ALERT_EMAIL: z.string().default('')
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error.flatten()));
export const env = parsed.data;
