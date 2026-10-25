import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Group from '../models/Group.js';
import Enrollment from '../models/Enrollment.js';
import AppError from '../utils/AppError.js';
import { uploadStream } from './cloudinary.service.js';
import { cloudinaryFolders } from '../config/cloudinary.js';
import { sendNotificationToUser } from './notification.service.js';

export async function createAssignment(teacherId, data, files = []) {
  const group = await Group.findOne({ _id: data.group, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  const attachments = [];
  for (const f of files) {
    const isImage = f.mimetype.startsWith('image/');
    const uploadResult = await uploadStream(f.buffer, {
      folder: cloudinaryFolders.homework,
      resourceType: isImage ? 'image' : 'raw',
    });

    attachments.push({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      format: uploadResult.format,
      mimeType: f.mimetype,
      originalName: f.originalname,
      bytes: f.size,
    });
  }

  const assignment = await Assignment.create({
    group: data.group,
    teacher: teacherId,
    title: data.title,
    description: data.description,
    type: data.type || 'homework',
    dueDate: data.dueDate,
    maxScore: data.maxScore || 100,
    attachments,
  });

  // Notify students in the group
  const enrollments = await Enrollment.find({ group: data.group, status: 'active' }).select('student');
  for (const enr of enrollments) {
    sendNotificationToUser(enr.student, {
      type: 'assignment_new',
      data: { assignmentTitle: assignment.title },
    }).catch(() => {});
  }

  return assignment;
}

export async function listGroupAssignments(groupId) {
  return Assignment.find({ group: groupId }).sort({ dueDate: -1 });
}

export async function submitAssignment(assignmentId, studentId, { answerText }, files = []) {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw AppError.notFound('Assignment not found');

  const isEnrolled = await Enrollment.exists({
    group: assignment.group,
    student: studentId,
    status: { $in: ['active', 'paused'] },
  });
  if (!isEnrolled) throw AppError.notFound('Assignment not found');

  const uploadedFiles = [];
  for (const f of files) {
    const isImage = f.mimetype.startsWith('image/');
    const uploadResult = await uploadStream(f.buffer, {
      folder: cloudinaryFolders.homework,
      resourceType: isImage ? 'image' : 'raw',
    });

    uploadedFiles.push({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      format: uploadResult.format,
      mimeType: f.mimetype,
      originalName: f.originalname,
      bytes: f.size,
    });
  }

  const isLate = new Date() > new Date(assignment.dueDate);

  const submission = await Submission.findOneAndUpdate(
    { assignment: assignmentId, student: studentId },
    {
      assignment: assignmentId,
      student: studentId,
      group: assignment.group,
      answerText,
      $push: { files: { $each: uploadedFiles } },
      status: 'submitted',
      isLate,
      submittedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return submission;
}

export async function gradeSubmission(submissionId, teacherId, { score, feedback }) {
  const submission = await Submission.findById(submissionId).populate('assignment');
  if (!submission) throw AppError.notFound('Submission not found');

  if (String(submission.assignment.teacher) !== String(teacherId)) {
    throw AppError.forbidden('Only the assignment teacher can grade this submission');
  }

  submission.score = score;
  if (feedback !== undefined) submission.feedback = feedback;
  submission.status = 'graded';
  submission.gradedAt = new Date();
  submission.gradedBy = teacherId;
  await submission.save();

  sendNotificationToUser(submission.student, {
    type: 'assignment_graded',
    data: {
      assignmentTitle: submission.assignment.title,
      score,
      maxScore: submission.assignment.maxScore,
    },
  }).catch(() => {});

  return submission;
}

export async function getSubmissionsForAssignment(assignmentId, teacherId) {
  const assignment = await Assignment.findOne({ _id: assignmentId, teacher: teacherId });
  if (!assignment) throw AppError.notFound('Assignment not found');

  return Submission.find({ assignment: assignmentId })
    .populate('student', 'name avatar')
    .sort({ submittedAt: -1 });
}

export default {
  createAssignment,
  listGroupAssignments,
  submitAssignment,
  gradeSubmission,
  getSubmissionsForAssignment,
};
