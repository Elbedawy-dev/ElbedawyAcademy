export const ROLES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
});
export const ROLE_VALUES = Object.values(ROLES);
export const SELF_REGISTER_ROLES = [ROLES.STUDENT, ROLES.PARENT, ROLES.TEACHER];

export const GENDERS = ['male', 'female'];
export const LANGUAGES = ['ar', 'en'];
export const DEFAULT_TIMEZONE = 'Africa/Cairo';

// Egyptian system: 6 primary, 3 preparatory, 3 secondary
export const SCHOOL_GRADES = [
  'primary_1',
  'primary_2',
  'primary_3',
  'primary_4',
  'primary_5',
  'primary_6',
  'prep_1',
  'prep_2',
  'prep_3',
  'secondary_1',
  'secondary_2',
  'secondary_3',
];
export const STUDENT_GRADES = [...SCHOOL_GRADES, 'none'];
// Levels usable by groups: school grades or Quran levels
export const QURAN_LEVELS = ['all_ages', 'kids', 'adults', 'beginner', 'intermediate', 'advanced'];
export const GROUP_LEVELS = [...SCHOOL_GRADES, ...QURAN_LEVELS];
export const STUDENT_QURAN_LEVELS = ['none', 'beginner', 'intermediate', 'advanced', 'hafiz'];

export const TEACHER_STATUS = ['pending', 'approved', 'rejected', 'suspended'];
export const TEACHER_SPECIALTIES = ['quran', 'tajweed', 'school'];
export const CERTIFICATE_FILE_TYPES = ['ijazah', 'degree', 'course', 'other'];
export const CERT_VERIFICATION_STATUS = ['pending', 'verified', 'rejected'];

export const SUBJECT_TYPES = ['quran', 'tajweed_matn', 'school'];

export const GROUP_GENDER_TYPES = ['boys', 'girls', 'mixed'];
export const GROUP_STATUS = ['open', 'full', 'closed'];
export const JOIN_MODES = ['invite_only', 'request', 'open'];
export const BILLING_CYCLES = ['monthly', 'per_session', 'full_course'];
export const CURRENCIES = ['EGP', 'USD', 'SAR', 'AED', 'KWD', 'EUR', 'GBP'];

export const ENROLLMENT_STATUS = ['pending', 'awaiting_payment', 'active', 'paused', 'cancelled'];
export const CURRENT_ENROLLMENT_STATUSES = ['pending', 'awaiting_payment', 'active', 'paused'];
export const MEMBER_ENROLLMENT_STATUSES = ['active', 'paused'];
export const HELD_ENROLLMENT_STATUSES = ['active', 'paused', 'awaiting_payment'];
export const SUBSCRIPTION_STATUS = ['none', 'active', 'grace', 'expired'];

export const SESSION_TYPES = [
  'quran',
  'tafsir',
  'review',
  'matn_tuhfa',
  'matn_jazariyyah',
  'lesson',
];
export const MATN_TYPES = ['matn_tuhfa', 'matn_jazariyyah'];
export const SESSION_STATUS = ['scheduled', 'live', 'ended', 'cancelled'];
export const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused'];

export const QURAN_ENTRY_TYPES = [
  'new_memorization',
  'near_review',
  'far_review',
  'tajweed',
  'tafsir',
];
export const REVIEW_ENTRY_TYPES = ['near_review', 'far_review'];
export const QURAN_RATINGS = ['excellent', 'very_good', 'good', 'needs_repeat'];
export const SCHOOL_TERMS = ['term_1', 'term_2', 'summer', 'full_year'];

export const ASSIGNMENT_TYPES = ['homework', 'quiz'];
export const SUBMISSION_STATUS = ['submitted', 'graded', 'late'];

export const MESSAGE_TYPES = ['text', 'image', 'file', 'audio'];

export const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded', 'expired'];
export const PAYMENT_METHODS = ['card', 'wallet'];
export const PAYMENT_PROVIDERS = ['paymob', 'manual'];
export const PAYOUT_STATUS = ['pending', 'approved', 'paid'];

export const CERTIFICATE_TYPES = ['juz_completion', 'surah', 'course'];
export const REVIEW_STATUS = ['visible', 'hidden'];
export const REPORT_TARGETS = ['message', 'user', 'group'];
export const REPORT_STATUS = ['open', 'reviewing', 'resolved', 'dismissed'];

export const NOTIFICATION_TYPES = [
  'session_reminder',
  'session_started',
  'session_cancelled',
  'absence_alert',
  'progress_entry',
  'assignment_new',
  'assignment_due',
  'assignment_graded',
  'payment_success',
  'payment_failed',
  'payment_refunded',
  'subscription_expiring',
  'subscription_expired',
  'teacher_approved',
  'teacher_rejected',
  'teacher_suspended',
  'enrollment_request',
  'enrollment_accepted',
  'enrollment_rejected',
  'enrollment_removed',
  'parent_link_request',
  'parent_link_accepted',
  'certificate_issued',
  'payout_paid',
  'chat_mention',
  'broadcast',
];

export const AUDIT_ACTIONS = Object.freeze({
  TEACHER_APPROVED: 'teacher.approved',
  TEACHER_REJECTED: 'teacher.rejected',
  TEACHER_SUSPENDED: 'teacher.suspended',
  CERTIFICATE_REVIEWED: 'teacher.certificate_reviewed',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_SENSITIVE_UPDATED: 'user.sensitive_updated',
  USER_DELETED: 'user.deleted',
  USER_STATUS_CHANGED: 'user.status_changed',
  GROUP_PRICE_CHANGED: 'group.price_changed',
  GROUP_DELETED: 'group.deleted',
  MEMBER_REMOVED: 'group.member_removed',
  MEMBER_MOVED: 'group.member_moved',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYOUT_CALCULATED: 'payout.calculated',
  PAYOUT_APPROVED: 'payout.approved',
  PAYOUT_PAID: 'payout.paid',
  SETTINGS_UPDATED: 'settings.updated',
  REVIEW_MODERATED: 'review.moderated',
  REPORT_RESOLVED: 'report.resolved',
  CERTIFICATE_ISSUED: 'certificate.issued',
  CERTIFICATE_REVOKED: 'certificate.revoked',
  MESSAGE_DELETED: 'chat.message_deleted',
  STUDENT_MUTED: 'chat.student_muted',
});

// Days of week follow JS convention: 0 = Sunday ... 6 = Saturday
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];
export const MATN_DAYS = [0, 4]; // Sunday and Thursday

export const SENSITIVE_USER_FIELDS = ['email', 'dateOfBirth', 'name'];

export const UPLOAD_LIMITS = Object.freeze({
  avatar: { maxSize: 2 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
  certificate: {
    maxSize: 5 * 1024 * 1024,
    maxFiles: 5,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  attachment: {
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    mimes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
  },
});
