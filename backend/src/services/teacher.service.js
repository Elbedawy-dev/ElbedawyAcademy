import TeacherProfile from '../models/TeacherProfile.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Group from '../models/Group.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { uploadStream, deleteAsset, getAuthenticatedDownloadUrl } from './cloudinary.service.js';
import { cloudinaryFolders } from '../config/cloudinary.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { sendNotificationToUser } from './notification.service.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';
import { teacherPublic } from '../utils/serializers.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export async function getMyTeacherProfile(userId) {
  const profile = await TeacherProfile.findOne({ user: userId })
    .select('+bankOrWalletInfo')
    .populate('subjects', 'name type');
  if (!profile) throw AppError.notFound('Teacher profile not found');

  const profileObj = profile.toJSON();
  if (profile.bankOrWalletInfo) {
    try {
      profileObj.bankOrWalletInfo = decrypt(profile.bankOrWalletInfo);
    } catch {
      profileObj.bankOrWalletInfo = null;
    }
  }

  return profileObj;
}

export async function updateMyTeacherProfile(userId, data) {
  const profile = await TeacherProfile.findOne({ user: userId });
  if (!profile) throw AppError.notFound('Teacher profile not found');

  if (data.bio !== undefined) profile.bio = data.bio;
  if (data.specialties !== undefined) profile.specialties = data.specialties;
  if (data.subjects !== undefined) profile.subjects = data.subjects;
  if (data.yearsOfExperience !== undefined) profile.yearsOfExperience = data.yearsOfExperience;
  if (data.bankOrWalletInfo !== undefined) {
    profile.bankOrWalletInfo = encrypt(data.bankOrWalletInfo);
  }

  await profile.save();
  return getMyTeacherProfile(userId);
}

export async function addCertificates(userId, files = [], meta = {}) {
  const profile = await TeacherProfile.findOne({ user: userId });
  if (!profile) throw AppError.notFound('Teacher profile not found');

  const added = [];
  for (const file of files) {
    const isPdf = file.mimetype === 'application/pdf';
    const uploadResult = await uploadStream(file.buffer, {
      folder: cloudinaryFolders.certificates,
      resourceType: isPdf ? 'raw' : 'image',
      type: 'authenticated', // Private authenticated asset
    });

    const cert = {
      title: meta.title || file.originalname || 'Certificate',
      issuer: meta.issuer || '',
      type: meta.type || 'other',
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      format: uploadResult.format,
      mimeType: file.mimetype,
      verificationStatus: 'pending',
      uploadedAt: new Date(),
    };

    profile.certificates.push(cert);
    added.push(cert);
  }

  await profile.save();
  return profile.certificates;
}

export async function deleteCertificate(userId, certId) {
  const profile = await TeacherProfile.findOne({ user: userId });
  if (!profile) throw AppError.notFound('Teacher profile not found');

  const cert = profile.certificates.id(certId);
  if (!cert) throw AppError.notFound('Certificate not found');

  if (cert.publicId) {
    await deleteAsset(cert.publicId, {
      resourceType: cert.resourceType,
      type: 'authenticated',
    });
  }

  cert.deleteOne();
  await profile.save();

  return { success: true, message: 'Certificate removed' };
}

export async function getCertificateDownload(currentUser, teacherId, certId) {
  // Only the teacher themselves or admin can view certificates
  if (currentUser.role !== 'admin' && String(currentUser._id) !== String(teacherId)) {
    throw AppError.notFound('Certificate not found');
  }

  const profile = await TeacherProfile.findOne({ user: teacherId });
  if (!profile) throw AppError.notFound('Teacher not found');

  const cert = profile.certificates.id(certId);
  if (!cert) throw AppError.notFound('Certificate not found');

  const downloadUrl = getAuthenticatedDownloadUrl(cert.publicId, cert.format || 'pdf');
  return { downloadUrl, cert };
}

export async function adminApproveRejectTeacher(teacherId, status, reason, adminUser, actorMeta = {}) {
  const profile = await TeacherProfile.findOne({ user: teacherId });
  if (!profile) throw AppError.notFound('Teacher profile not found');

  const teacherUser = await User.findById(teacherId);
  if (!teacherUser) throw AppError.notFound('User not found');

  if (status === 'approved') {
    if (!profile.certificates || profile.certificates.length === 0) {
      throw AppError.badRequest(
        'Teacher must have at least one uploaded certificate before approval',
        undefined,
        'NO_CERTIFICATES',
      );
    }

    profile.status = 'approved';
    profile.approvedAt = new Date();
    profile.approvedBy = adminUser._id;
    profile.rejectionReason = undefined;
    profile.suspensionReason = undefined;

    // Auto-create room for approved teacher if not already present
    let room = await Room.findOne({ teacher: teacherId });
    if (!room) {
      room = await Room.create({
        teacher: teacherId,
        name: `غرفة المعلم ${teacherUser.name}`,
        description: profile.bio || `غرفة ${teacherUser.name} للدروس المباشرة`,
      });
    }

    await profile.save();

    await AuditLog.create({
      actor: adminUser._id,
      action: AUDIT_ACTIONS.TEACHER_APPROVED,
      entity: 'TeacherProfile',
      entityId: profile._id,
      meta: { teacherId, roomId: room._id },
      ip: actorMeta.ip,
      userAgent: actorMeta.userAgent,
    });

    sendNotificationToUser(teacherId, {
      type: 'teacher_approved',
      data: { roomId: String(room._id) },
    }).catch(() => {});

    sendTemplateEmail(teacherUser.email, 'generic', {
      title: 'تهانينا! تمت الموافقة على حسابك التعليمي',
      message: `تم اعتماد حسابك في أكاديمية البديوي، وتم تجهيز غرفتك التعليمية: "${room.name}". يمكنك الآن إنشاء مجموعاتك وجداولك.`,
    }).catch(() => {});
  } else if (status === 'rejected') {
    profile.status = 'rejected';
    profile.rejectionReason = reason;
    await profile.save();

    await AuditLog.create({
      actor: adminUser._id,
      action: AUDIT_ACTIONS.TEACHER_REJECTED,
      entity: 'TeacherProfile',
      entityId: profile._id,
      meta: { teacherId, reason },
      ip: actorMeta.ip,
      userAgent: actorMeta.userAgent,
    });

    sendNotificationToUser(teacherId, {
      type: 'teacher_rejected',
      data: { reason },
    }).catch(() => {});
  } else if (status === 'suspended') {
    profile.status = 'suspended';
    profile.suspensionReason = reason;
    await profile.save();

    // Close their open groups
    await Group.updateMany(
      { teacher: teacherId, status: 'open' },
      { status: 'closed' },
    );

    await AuditLog.create({
      actor: adminUser._id,
      action: AUDIT_ACTIONS.TEACHER_SUSPENDED,
      entity: 'TeacherProfile',
      entityId: profile._id,
      meta: { teacherId, reason },
      ip: actorMeta.ip,
      userAgent: actorMeta.userAgent,
    });

    sendNotificationToUser(teacherId, {
      type: 'teacher_suspended',
      data: { reason },
    }).catch(() => {});
  }

  return profile;
}

export async function adminReviewCertificate(teacherId, certId, certStatus, adminNote, adminUser, actorMeta = {}) {
  const profile = await TeacherProfile.findOne({ user: teacherId });
  if (!profile) throw AppError.notFound('Teacher profile not found');

  const cert = profile.certificates.id(certId);
  if (!cert) throw AppError.notFound('Certificate not found');

  cert.verificationStatus = certStatus;
  if (adminNote) cert.adminNote = adminNote;
  cert.reviewedBy = adminUser._id;
  cert.reviewedAt = new Date();

  await profile.save();

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.CERTIFICATE_REVIEWED,
    entity: 'Certificate',
    entityId: cert._id,
    meta: { teacherId, status: certStatus, adminNote },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  return cert;
}

export async function getTeacherCatalogue(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const profileFilter = { status: 'approved' };
  if (query.specialty) profileFilter.specialties = query.specialty;
  if (query.rating) profileFilter.ratingAvg = { $gte: parseFloat(query.rating) };
  if (query.subject) profileFilter.subjects = query.subject;

  let teacherUserIds = null;
  const userFilter = { role: 'teacher', isActive: true, deletedAt: null };
  if (query.gender) userFilter.gender = query.gender;
  if (query.search) {
    const s = String(query.search).trim();
    userFilter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { 'address.city': { $regex: s, $options: 'i' } },
      { 'address.country': { $regex: s, $options: 'i' } },
    ];
  }

  const matchingUsers = await User.find(userFilter).select('_id');
  teacherUserIds = matchingUsers.map((u) => u._id);
  profileFilter.user = { $in: teacherUserIds };

  const [profiles, total] = await Promise.all([
    TeacherProfile.find(profileFilter)
      .populate('user', 'name avatar gender address')
      .populate('subjects', 'name type')
      .sort({ ratingAvg: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TeacherProfile.countDocuments(profileFilter),
  ]);

  const cards = profiles.map((p) => teacherPublic(p.user, p));

  return {
    data: cards,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getTeacherPublicProfile(teacherId) {
  const profile = await TeacherProfile.findOne({ user: teacherId, status: 'approved' })
    .populate('user', 'name avatar gender address createdAt')
    .populate('subjects', 'name type gradeLevels');

  if (!profile || !profile.user) throw AppError.notFound('Teacher not found');

  // Load public open groups
  const groups = await Group.find({
    teacher: teacherId,
    status: { $in: ['open', 'full'] },
    deletedAt: null,
  })
    .select('name subject gradeLevel genderType price schedule status activeMembersCount maxStudents')
    .populate('subject', 'name type');

  return teacherPublic(profile.user, profile, { groups });
}

export default {
  getMyTeacherProfile,
  updateMyTeacherProfile,
  addCertificates,
  deleteCertificate,
  getCertificateDownload,
  adminApproveRejectTeacher,
  adminReviewCertificate,
  getTeacherCatalogue,
  getTeacherPublicProfile,
};
