import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export async function createReport(reporterId, data) {
  const report = await Report.create({
    reporter: reporterId,
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
    status: 'open',
  });
  return report;
}

export async function resolveReport(reportId, { status, resolutionNotes }, adminUser) {
  const report = await Report.findById(reportId);
  if (!report) throw AppError.notFound('Report not found');

  report.status = status;
  if (resolutionNotes) report.resolutionNotes = resolutionNotes;
  report.resolvedBy = adminUser._id;
  report.resolvedAt = new Date();
  await report.save();

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.REPORT_RESOLVED,
    entity: 'Report',
    entityId: report._id,
    meta: { status, resolutionNotes },
  });

  return report;
}

export async function listReports(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.targetType) filter.targetType = query.targetType;

  const [data, total] = await Promise.all([
    Report.find(filter)
      .populate('reporter', 'name email role')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(filter),
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
  createReport,
  resolveReport,
  listReports,
};
