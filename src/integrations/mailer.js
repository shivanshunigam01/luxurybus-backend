import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let cachedTransporter = null;

const canSendEmail = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);

const getTransporter = () => {
  if (!canSendEmail()) return null;
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return cachedTransporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: 'smtp_not_configured' };
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html: html || `<pre>${text}</pre>`,
  });
  return { sent: true };
};
