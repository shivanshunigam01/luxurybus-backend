import { NotificationLog } from '../models/NotificationLog.js';
import { UserNotification } from '../models/UserNotification.js';
import { sendEmail } from '../integrations/mailer.js';
import { logger } from '../utils/logger.js';

export const createInAppNotification = async ({ userId, title, body = '', type = 'info', href = '', meta = {} }) => {
  if (!userId) return null;
  return UserNotification.create({ userId, title, body, type, href, meta });
};

export const listUserNotifications = async (userId, { unreadOnly = false, limit = 30 } = {}) => {
  const filter = { userId };
  if (unreadOnly) filter.read = false;
  const rows = await UserNotification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  const unreadCount = await UserNotification.countDocuments({ userId, read: false });
  return {
    unreadCount,
    notifications: rows.map((n) => ({
      id: String(n._id),
      title: n.title,
      body: n.body,
      type: n.type,
      href: n.href,
      read: n.read,
      createdAt: n.createdAt,
    })),
  };
};

export const markNotificationRead = async (userId, id) => {
  await UserNotification.updateOne({ _id: id, userId }, { read: true });
  return { ok: true };
};

export const markAllNotificationsRead = async (userId) => {
  await UserNotification.updateMany({ userId, read: false }, { read: true });
  return { ok: true };
};

/** Channels: email (SMTP) + inapp only. */
export const notifyChannels = async ({
  userId = null,
  email = '',
  subject,
  body,
  channels = ['email', 'inapp'],
  type = 'info',
  href = '',
  recipientType = 'customer',
  recipientId = null,
}) => {
  const results = {};
  const useEmail = channels.includes('email');

  if (channels.includes('inapp') && userId) {
    await createInAppNotification({ userId, title: subject, body, type, href });
    results.inapp = { sent: true };
  }

  if (useEmail && email) {
    const r = await sendEmail({ to: email, subject, text: body });
    results.email = r;
    await NotificationLog.create({
      recipientType,
      recipientId: recipientId || userId || null,
      channel: 'email',
      subject,
      body,
      message: body,
      status: r.sent ? 'sent' : 'failed',
    });
  }

  logger.info('notify_channels', { subject, channels: ['email', 'inapp'], results });
  return results;
};
