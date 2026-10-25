/**
 * Bilingual notification templates. Each template receives `data` and returns
 * { title, body } for both Arabic and English; the user's language picks one.
 */
const templates = {
  session_reminder: (d) => ({
    ar: { title: 'تذكير بالحصة', body: `تبدأ حصة "${d.sessionTitle}" بعد ${d.minutes} دقيقة` },
    en: { title: 'Session reminder', body: `"${d.sessionTitle}" starts in ${d.minutes} minutes` },
  }),
  session_started: (d) => ({
    ar: { title: 'بدأت الحصة الآن', body: `بدأ البث المباشر لحصة "${d.sessionTitle}"، انضم الآن` },
    en: { title: 'Session is live', body: `"${d.sessionTitle}" is live now. Join!` },
  }),
  session_cancelled: (d) => ({
    ar: { title: 'تم إلغاء الحصة', body: `تم إلغاء حصة "${d.sessionTitle}"${d.reason ? `: ${d.reason}` : ''}` },
    en: { title: 'Session cancelled', body: `"${d.sessionTitle}" was cancelled${d.reason ? `: ${d.reason}` : ''}` },
  }),
  absence_alert: (d) => ({
    ar: { title: 'تنبيه غياب', body: `تغيّب ${d.studentName} عن حصة "${d.sessionTitle}"` },
    en: { title: 'Absence alert', body: `${d.studentName} was absent from "${d.sessionTitle}"` },
  }),
  progress_entry: (d) => ({
    ar: { title: 'تحديث في ملف المتابعة', body: `أضاف المعلم تقييمًا جديدًا لـ ${d.studentName}` },
    en: { title: 'Progress updated', body: `A new progress entry was added for ${d.studentName}` },
  }),
  assignment_new: (d) => ({
    ar: { title: 'واجب جديد', body: `واجب جديد: "${d.assignmentTitle}"` },
    en: { title: 'New assignment', body: `New assignment: "${d.assignmentTitle}"` },
  }),
  assignment_due: (d) => ({
    ar: { title: 'موعد تسليم الواجب', body: `آخر موعد لتسليم "${d.assignmentTitle}" خلال 24 ساعة` },
    en: { title: 'Assignment due soon', body: `"${d.assignmentTitle}" is due within 24 hours` },
  }),
  assignment_graded: (d) => ({
    ar: { title: 'تم تصحيح الواجب', body: `تم تصحيح "${d.assignmentTitle}": ${d.score}/${d.maxScore}` },
    en: { title: 'Assignment graded', body: `"${d.assignmentTitle}" graded: ${d.score}/${d.maxScore}` },
  }),
  payment_success: (d) => ({
    ar: { title: 'تم الدفع بنجاح', body: `تم استلام ${d.amount} ${d.currency} لمجموعة "${d.groupName}"` },
    en: { title: 'Payment successful', body: `${d.amount} ${d.currency} received for "${d.groupName}"` },
  }),
  payment_failed: (d) => ({
    ar: { title: 'فشل الدفع', body: `لم تتم عملية الدفع لمجموعة "${d.groupName}"، حاول مرة أخرى` },
    en: { title: 'Payment failed', body: `Payment for "${d.groupName}" failed. Please try again.` },
  }),
  payment_refunded: (d) => ({
    ar: { title: 'تم استرداد المبلغ', body: `تم استرداد ${d.amount} ${d.currency}` },
    en: { title: 'Payment refunded', body: `${d.amount} ${d.currency} has been refunded` },
  }),
  subscription_expiring: (d) => ({
    ar: { title: 'الاشتراك على وشك الانتهاء', body: `ينتهي اشتراك "${d.groupName}" خلال ${d.days} يوم` },
    en: { title: 'Subscription expiring', body: `Your "${d.groupName}" subscription ends in ${d.days} day(s)` },
  }),
  subscription_expired: (d) => ({
    ar: { title: 'انتهى الاشتراك', body: `انتهى اشتراك "${d.groupName}"، جدّد للاستمرار في الحضور` },
    en: { title: 'Subscription expired', body: `Your "${d.groupName}" subscription has expired. Renew to keep attending.` },
  }),
  teacher_approved: () => ({
    ar: { title: 'تم قبولك معلمًا', body: 'تمت الموافقة على حسابك، وتم إنشاء غرفتك الخاصة' },
    en: { title: 'You are approved', body: 'Your teacher account was approved and your room is ready' },
  }),
  teacher_rejected: (d) => ({
    ar: { title: 'تم رفض الطلب', body: `تم رفض طلبك: ${d.reason || ''}` },
    en: { title: 'Application rejected', body: `Your application was rejected: ${d.reason || ''}` },
  }),
  teacher_suspended: (d) => ({
    ar: { title: 'تم إيقاف الحساب', body: `تم إيقاف حسابك مؤقتًا: ${d.reason || ''}` },
    en: { title: 'Account suspended', body: `Your teacher account was suspended: ${d.reason || ''}` },
  }),
  enrollment_request: (d) => ({
    ar: { title: 'طلب انضمام جديد', body: `${d.studentName} يطلب الانضمام` },
    en: { title: 'New join request', body: `${d.studentName} requested to join` },
  }),
  enrollment_accepted: (d) => ({
    ar: { title: 'تم قبول الانضمام', body: `تم قبولك في مجموعة "${d.groupName}"` },
    en: { title: 'Request accepted', body: `You joined "${d.groupName}"` },
  }),
  enrollment_rejected: (d) => ({
    ar: { title: 'تم رفض طلب الانضمام', body: d.reason ? `السبب: ${d.reason}` : 'تم رفض طلبك' },
    en: { title: 'Request rejected', body: d.reason ? `Reason: ${d.reason}` : 'Your request was rejected' },
  }),
  enrollment_removed: (d) => ({
    ar: { title: 'تمت إزالتك من المجموعة', body: `لم تعد عضوًا في "${d.groupName}"` },
    en: { title: 'Removed from group', body: `You are no longer a member of "${d.groupName}"` },
  }),
  parent_link_request: (d) => ({
    ar: { title: 'طلب ربط ولي أمر', body: `${d.parentName} يطلب ربط حسابك به` },
    en: { title: 'Parent link request', body: `${d.parentName} wants to link to your account` },
  }),
  parent_link_accepted: (d) => ({
    ar: { title: 'تم ربط الحساب', body: `تم ربط ${d.studentName} بحسابك` },
    en: { title: 'Account linked', body: `${d.studentName} is now linked to your account` },
  }),
  certificate_issued: (d) => ({
    ar: { title: 'شهادة جديدة', body: `مبارك! حصل ${d.studentName} على شهادة: ${d.title}` },
    en: { title: 'New certificate', body: `Congratulations! ${d.studentName} earned: ${d.title}` },
  }),
  payout_paid: (d) => ({
    ar: { title: 'تم تحويل أرباحك', body: `تم تحويل ${d.amount} ${d.currency} عن فترة ${d.period}` },
    en: { title: 'Payout sent', body: `${d.amount} ${d.currency} for ${d.period} has been paid` },
  }),
  chat_mention: (d) => ({
    ar: { title: `رسالة في ${d.groupName}`, body: d.preview },
    en: { title: `Message in ${d.groupName}`, body: d.preview },
  }),
  broadcast: (d) => ({
    ar: { title: d.title, body: d.body },
    en: { title: d.title, body: d.body },
  }),
};

export function renderNotification(type, data = {}, language = 'ar') {
  const template = templates[type];
  if (!template) return { title: data.title || type, body: data.body || '' };
  const rendered = template(data);
  return rendered[language] || rendered.ar;
}

export default templates;
