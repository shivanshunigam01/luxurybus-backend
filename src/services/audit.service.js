import { AuditLog } from '../models/AuditLog.js';
import { parsePagination, paginatedResult } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';

export const writeAudit = async ({
  req = null,
  actorId = null,
  actorRole = '',
  actorEmail = '',
  action,
  entityType = '',
  entityId = '',
  message = '',
  meta = {},
}) => {
  try {
    const user = req?.user;
    await AuditLog.create({
      actorId: actorId || user?.sub || null,
      actorRole: actorRole || user?.role || '',
      actorEmail: actorEmail || '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      message,
      meta,
      ip: req?.headers?.['x-forwarded-for']?.toString().split(',')[0] || req?.socket?.remoteAddress || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    logger.error('audit_write_failed', { error: err.message, action });
  }
};

export const listAuditLogs = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 50 });
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.q) {
    const q = String(query.q).trim();
    filter.$or = [
      { message: new RegExp(q, 'i') },
      { action: new RegExp(q, 'i') },
      { actorEmail: new RegExp(q, 'i') },
      { entityId: new RegExp(q, 'i') },
    ];
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return paginatedResult({
    items: rows.map((r) => ({
      id: String(r._id),
      actorId: r.actorId ? String(r.actorId) : null,
      actorRole: r.actorRole,
      actorEmail: r.actorEmail,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      message: r.message,
      meta: r.meta,
      ip: r.ip,
      createdAt: r.createdAt,
    })),
    total,
    page,
    limit,
  });
};
