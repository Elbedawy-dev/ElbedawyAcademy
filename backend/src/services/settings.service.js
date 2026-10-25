import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export async function getSettings() {
  return Settings.getSettings();
}

export async function updateSettings(updates, adminUser, actorMeta = {}) {
  const settings = await Settings.getSettings();

  Object.assign(settings, updates);
  await settings.save();

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    entity: 'Settings',
    entityId: settings._id,
    meta: updates,
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  return settings;
}

export async function listAuditLogs(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 30));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entity) filter.entity = query.entity;
  if (query.actor) filter.actor = query.actor;
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default {
  getSettings,
  updateSettings,
  listAuditLogs,
};
