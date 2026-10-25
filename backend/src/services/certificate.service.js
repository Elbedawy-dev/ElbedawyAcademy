import PDFDocument from 'pdfkit';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { randomCode } from '../utils/crypto.js';
import { sendNotificationToUser } from './notification.service.js';

export async function issueCertificate(studentId, data, issuedBy) {
  const student = await User.findById(studentId);
  if (!student) throw AppError.notFound('Student not found');

  const code = `EA-${randomCode(4)}-${randomCode(4)}`;

  const cert = await Certificate.create({
    student: studentId,
    type: data.type,
    title: data.title,
    code,
    issuedBy,
    metadata: data.metadata,
  });

  sendNotificationToUser(studentId, {
    type: 'certificate_issued',
    data: {
      studentName: student.name,
      title: cert.title,
    },
  }).catch(() => {});

  return cert;
}

export async function verifyCertificate(code) {
  const cleanCode = String(code).trim().toUpperCase();
  const cert = await Certificate.findOne({ code: cleanCode })
    .populate('student', 'name avatar gender')
    .populate('issuedBy', 'name');

  if (!cert) {
    throw AppError.notFound('Certificate code not found or invalid');
  }

  return {
    valid: !cert.isRevoked,
    certificate: cert,
  };
}

export async function getStudentCertificates(studentId) {
  return Certificate.find({ student: studentId, isRevoked: false })
    .populate('issuedBy', 'name')
    .sort({ issuedAt: -1 });
}

export async function generateCertificatePdf(code) {
  const { certificate: cert } = await verifyCertificate(code);
  if (!cert) throw AppError.notFound('Certificate not found');

  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margin: 40,
  });

  // Certificate border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .lineWidth(4)
    .stroke('#0f766e');

  doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50)
    .lineWidth(1)
    .stroke('#14b8a6');

  doc.moveDown(2);
  doc.fontSize(28).fillColor('#0f766e').text('ELBEDAWY ACADEMY', { align: 'center' });
  doc.fontSize(14).fillColor('#555555').text('CERTIFICATE OF ACHIEVEMENT', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(12).fillColor('#444444').text('This is proudly presented to', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(24).fillColor('#111827').text(cert.student?.name || 'Student Name', { align: 'center', underline: true });
  doc.moveDown(1);

  doc.fontSize(14).fillColor('#374151').text(
    `For successfully completing: ${cert.title}`,
    { align: 'center' },
  );
  doc.moveDown(2);

  doc.fontSize(10).fillColor('#6b7280');
  doc.text(`Issued Date: ${new Date(cert.issuedAt).toLocaleDateString()}`, 60, doc.page.height - 100);
  doc.text(`Verification Code: ${cert.code}`, { align: 'center' }, doc.page.height - 100);
  doc.text(`Instructor: ${cert.issuedBy?.name || 'Academic Board'}`, doc.page.width - 200, doc.page.height - 100);

  doc.end();
  return doc;
}

export default {
  issueCertificate,
  verifyCertificate,
  getStudentCertificates,
  generateCertificatePdf,
};
