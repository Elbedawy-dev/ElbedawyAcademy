import PDFDocument from 'pdfkit';
import QuranProgress from '../models/QuranProgress.js';
import QuranSummary from '../models/QuranSummary.js';
import SchoolProgress from '../models/SchoolProgress.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import ParentLink from '../models/ParentLink.js';
import Enrollment from '../models/Enrollment.js';
import AppError from '../utils/AppError.js';
import {
  expandPages,
  juzPageRange,
  TOTAL_PAGES,
  getSurah,
  isValidAyahRange,
} from '../utils/quran.js';
import { sendNotificationToUser } from './notification.service.js';

export async function addQuranEntry(teacherId, data) {
  const student = await User.findById(data.student);
  if (!student) throw AppError.notFound('Student not found');

  if (!isValidAyahRange(data.surah, data.fromAyah, data.toAyah)) {
    throw AppError.badRequest('Invalid ayah range for selected surah', undefined, 'INVALID_AYAH_RANGE');
  }

  const entry = await QuranProgress.create({
    ...data,
    teacher: teacherId,
    date: data.date || new Date(),
  });

  // Re-aggregate QuranSummary for the student
  await recalculateQuranSummary(data.student);

  sendNotificationToUser(data.student, {
    type: 'progress_entry',
    data: { studentName: student.name },
  }).catch(() => {});

  return entry;
}

export async function recalculateQuranSummary(studentId) {
  const entries = await QuranProgress.find({ student: studentId });

  const memorizedPagesSet = new Set();
  const lastReviewMap = new Map(); // juz -> date
  let lastNewEntry = null;

  for (const e of entries) {
    if (e.entryType === 'new_memorization') {
      const pFrom = e.pageFrom;
      const pTo = e.pageTo || e.pageFrom;
      if (pFrom && pTo) {
        expandPages(pFrom, pTo).forEach((p) => memorizedPagesSet.add(p));
      }
      if (!lastNewEntry || new Date(e.date) > new Date(lastNewEntry.date)) {
        lastNewEntry = e;
      }
    } else if (['near_review', 'far_review'].includes(e.entryType)) {
      const prevDate = lastReviewMap.get(e.juz);
      if (!prevDate || new Date(e.date) > new Date(prevDate)) {
        lastReviewMap.set(e.juz, e.date);
      }
    }
  }

  const memorizedPagesList = Array.from(memorizedPagesSet).sort((a, b) => a - b);
  const totalPages = memorizedPagesList.length;
  const percentage = Math.round((totalPages / TOTAL_PAGES) * 10000) / 100;

  // Check which juz are 100% completed
  const juzCompleted = [];
  for (let j = 1; j <= 30; j += 1) {
    const { from, to } = juzPageRange(j);
    let complete = true;
    for (let p = from; p <= to; p += 1) {
      if (!memorizedPagesSet.has(p)) {
        complete = false;
        break;
      }
    }
    if (complete) juzCompleted.push(j);
  }

  const lastReviewDateByJuz = [];
  for (const [juz, date] of lastReviewMap.entries()) {
    lastReviewDateByJuz.push({ juz, lastReviewedAt: date });
  }

  const currentPosition = lastNewEntry
    ? {
        surah: lastNewEntry.surah,
        ayah: lastNewEntry.toAyah,
        page: lastNewEntry.pageTo || lastNewEntry.pageFrom,
        juz: lastNewEntry.juz,
      }
    : {};

  const summary = await QuranSummary.findOneAndUpdate(
    { student: studentId },
    {
      student: studentId,
      totalPagesMemorized: totalPages,
      memorizedPagesList,
      juzCompleted,
      currentPosition,
      lastReviewDateByJuz,
      percentageMemorized: percentage,
    },
    { upsert: true, new: true },
  );

  return summary;
}

export async function updateQuranEntry(entryId, teacherId, updates) {
  const entry = await QuranProgress.findOne({ _id: entryId, teacher: teacherId });
  if (!entry) throw AppError.notFound('Progress entry not found');

  const effSurah = updates.surah !== undefined ? updates.surah : entry.surah;
  const effFrom = updates.fromAyah !== undefined ? updates.fromAyah : entry.fromAyah;
  const effTo = updates.toAyah !== undefined ? updates.toAyah : entry.toAyah;

  if (!isValidAyahRange(effSurah, effFrom, effTo)) {
    throw AppError.badRequest('Invalid ayah range for selected surah', undefined, 'INVALID_AYAH_RANGE');
  }

  Object.assign(entry, updates);
  await entry.save();

  await recalculateQuranSummary(entry.student);
  return entry;
}

export async function deleteQuranEntry(entryId, teacherId) {
  const entry = await QuranProgress.findOne({ _id: entryId, teacher: teacherId });
  if (!entry) throw AppError.notFound('Progress entry not found');

  const studentId = entry.student;
  await entry.deleteOne();

  await recalculateQuranSummary(studentId);
  return { success: true, message: 'Progress entry removed' };
}

export async function getStudentQuranTimeline(studentId, currentUser, query = {}) {
  await verifyProgressAccess(studentId, currentUser);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { student: studentId };
  if (query.entryType) filter.entryType = query.entryType;
  if (query.juz) filter.juz = Number(query.juz);
  if (query.surah) filter.surah = Number(query.surah);

  const [entries, total, summary] = await Promise.all([
    QuranProgress.find(filter)
      .populate('teacher', 'name avatar')
      .populate('group', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    QuranProgress.countDocuments(filter),
    QuranSummary.findOne({ student: studentId }),
  ]);

  return {
    data: entries,
    summary,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getNeedsReviewSuggestions(studentId, currentUser, daysThreshold = 14) {
  await verifyProgressAccess(studentId, currentUser);

  const summary = await QuranSummary.findOne({ student: studentId });
  if (!summary || !summary.juzCompleted || summary.juzCompleted.length === 0) {
    return { suggestions: [] };
  }

  const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
  const reviewedMap = new Map(
    (summary.lastReviewDateByJuz || []).map((item) => [item.juz, new Date(item.lastReviewedAt)]),
  );

  const suggestions = [];
  for (const juz of summary.juzCompleted) {
    const lastDate = reviewedMap.get(juz);
    if (!lastDate || lastDate < thresholdDate) {
      const daysSince = lastDate
        ? Math.floor((Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      suggestions.push({
        juz,
        lastReviewedAt: lastDate || null,
        daysSinceReview: daysSince,
        recommendation: `الجزء ${juz} لم تتم مراجعته منذ ${daysSince !== null ? `${daysSince} يومًا` : 'فترة طويلة'}`,
      });
    }
  }

  return { suggestions };
}

export async function recordSchoolProgress(teacherId, data) {
  const group = await Group.findOne({ _id: data.group, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  const progress = await SchoolProgress.create({
    ...data,
    teacher: teacherId,
  });

  return progress;
}

export async function getStudentSchoolProgress(studentId, currentUser) {
  await verifyProgressAccess(studentId, currentUser);

  return SchoolProgress.find({ student: studentId })
    .populate('subject', 'name type')
    .populate('group', 'name')
    .populate('teacher', 'name')
    .sort({ createdAt: -1 });
}

export async function generateProgressPdf(studentId, currentUser) {
  await verifyProgressAccess(studentId, currentUser);

  const [student, summary, recentEntries, schoolEntries] = await Promise.all([
    User.findById(studentId),
    QuranSummary.findOne({ student: studentId }),
    QuranProgress.find({ student: studentId }).sort({ date: -1 }).limit(15),
    SchoolProgress.find({ student: studentId }).populate('subject', 'name'),
  ]);

  if (!student) throw AppError.notFound('Student not found');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // PDF Header
  doc.fontSize(22).fillColor('#0f766e').text('Elbedawy Academy - Progress Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#333333').text(`Student: ${student.name}`, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(1.5);

  // Quran Summary Section
  doc.fontSize(16).fillColor('#0f766e').text('Quran Memorization Summary');
  doc.rect(40, doc.y, 515, 2).fill('#0f766e');
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor('#222222');
  doc.text(`Total Pages Memorized: ${summary?.totalPagesMemorized || 0} / 604 pages`);
  doc.text(`Progress: ${summary?.percentageMemorized || 0}%`);
  doc.text(`Completed Juz: ${(summary?.juzCompleted || []).join(', ') || 'None yet'}`);
  doc.moveDown(1.5);

  // Recent Quran Entries
  doc.fontSize(14).fillColor('#0f766e').text('Recent Quran Entries');
  doc.moveDown(0.5);

  for (const e of recentEntries) {
    const sName = getSurah(e.surah)?.nameAr || `Surah ${e.surah}`;
    doc.fontSize(10).fillColor('#333333').text(
      `• [${e.entryType}] ${sName} (Ayahs ${e.fromAyah}-${e.toAyah}) - Rating: ${e.rating} (${new Date(e.date).toLocaleDateString()})`,
    );
  }
  doc.moveDown(1.5);

  // School Progress Section
  if (schoolEntries && schoolEntries.length > 0) {
    doc.fontSize(14).fillColor('#0f766e').text('School Subjects Overview');
    doc.moveDown(0.5);
    for (const sp of schoolEntries) {
      doc.fontSize(11).fillColor('#111111').text(`Subject: ${sp.subject?.name?.ar || 'School Subject'} (${sp.term})`);
      if (sp.grades && sp.grades.length > 0) {
        for (const g of sp.grades) {
          doc.fontSize(10).fillColor('#555555').text(`  - ${g.title}: ${g.score}/${g.maxScore}`);
        }
      }
      doc.moveDown(0.5);
    }
  }

  doc.end();
  return doc;
}

async function verifyProgressAccess(studentId, currentUser) {
  if (currentUser.role === 'admin' || String(currentUser._id) === String(studentId)) {
    return true;
  }

  if (currentUser.role === 'parent') {
    const isLinked = await ParentLink.exists({
      parent: currentUser._id,
      student: studentId,
      status: 'accepted',
    });
    if (isLinked) return true;
  }

  if (currentUser.role === 'teacher') {
    const teacherGroups = await Group.find({ teacher: currentUser._id, deletedAt: null }).select('_id');
    const groupIds = teacherGroups.map((g) => g._id);
    const isStudentOfTeacher = await Enrollment.exists({
      group: { $in: groupIds },
      student: studentId,
      status: { $in: ['active', 'paused'] },
    });
    if (isStudentOfTeacher) return true;
  }

  throw AppError.notFound('Progress file not found');
}

export default {
  addQuranEntry,
  updateQuranEntry,
  deleteQuranEntry,
  getStudentQuranTimeline,
  getNeedsReviewSuggestions,
  recordSchoolProgress,
  getStudentSchoolProgress,
  generateProgressPdf,
  recalculateQuranSummary,
};
