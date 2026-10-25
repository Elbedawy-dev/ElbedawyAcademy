import ChatMessage from '../models/ChatMessage.js';
import Group from '../models/Group.js';
import Enrollment from '../models/Enrollment.js';
import ParentLink from '../models/ParentLink.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { uploadStream } from './cloudinary.service.js';
import { cloudinaryFolders } from '../config/cloudinary.js';
import { filterProfanity } from '../utils/profanity.js';
import { getIO } from '../sockets/index.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export async function sendMessage(groupId, senderId, { content, replyTo }, files = []) {
  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  // Verify sender is teacher or active student (parents have read-only access)
  const isTeacher = String(group.teacher) === String(senderId);
  if (!isTeacher) {
    const isMember = await Enrollment.exists({
      group: groupId,
      student: senderId,
      status: 'active',
    });
    if (!isMember) {
      throw AppError.forbidden('Only active members and the teacher can send messages in this group');
    }

    // Check if student is muted by the teacher
    if (group.mutedStudents && group.mutedStudents.some((id) => String(id) === String(senderId))) {
      throw AppError.forbidden('You have been muted in this group by the teacher', 'STUDENT_MUTED');
    }
  }

  // 1. Profanity filtering
  let cleanContent = content;
  if (content) {
    const { clean } = await filterProfanity(content);
    cleanContent = clean;
  }

  // 2. Attachments
  const attachments = [];
  let messageType = 'text';

  for (const f of files) {
    let rType = 'raw';
    if (f.mimetype.startsWith('image/')) {
      rType = 'image';
      messageType = 'image';
    } else if (f.mimetype.startsWith('audio/')) {
      rType = 'video'; // Cloudinary handles audio under video resource type
      messageType = 'audio';
    } else {
      messageType = 'file';
    }

    const uploadResult = await uploadStream(f.buffer, {
      folder: cloudinaryFolders.chat,
      resourceType: rType,
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

  const message = await ChatMessage.create({
    group: groupId,
    sender: senderId,
    type: messageType,
    content: cleanContent,
    attachments,
    replyTo,
    readBy: [{ user: senderId, readAt: new Date() }],
  });

  const populated = await ChatMessage.findById(message._id)
    .populate('sender', 'name avatar role')
    .populate('replyTo', 'content type sender');

  // Emit to socket room
  try {
    const io = getIO();
    if (io) {
      io.to(`group:${groupId}`).emit('chat:message', populated);
    }
  } catch {
    // Non-blocking
  }

  return populated;
}

export async function getGroupMessages(groupId, currentUser, query = {}) {
  // Authorization check
  await verifyChatReadAccess(groupId, currentUser);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 30));
  const skip = (page - 1) * limit;

  const filter = { group: groupId, isDeleted: false };
  if (query.before) {
    filter.createdAt = { $lt: new Date(query.before) };
  }

  const [messages, total] = await Promise.all([
    ChatMessage.find(filter)
      .populate('sender', 'name avatar role')
      .populate('replyTo', 'content type sender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ChatMessage.countDocuments(filter),
  ]);

  return {
    data: messages.reverse(),
    meta: {
      page,
      limit,
      total,
      hasMore: total > skip + limit,
    },
  };
}

export async function editMessage(messageId, userId, newContent) {
  const message = await ChatMessage.findOne({ _id: messageId, isDeleted: false });
  if (!message) throw AppError.notFound('Message not found');

  if (String(message.sender) !== String(userId)) {
    throw AppError.forbidden('You can only edit your own messages');
  }

  const settings = await Settings.getSettings();
  const editWindow = (settings.chatEditWindowMinutes || 15) * 60 * 1000;
  const elapsed = Date.now() - new Date(message.createdAt).getTime();

  if (elapsed > editWindow) {
    throw AppError.badRequest('Message edit window has expired');
  }

  const { clean } = await filterProfanity(newContent);
  message.content = clean;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  try {
    const io = getIO();
    if (io) {
      io.to(`group:${message.group}`).emit('chat:edited', {
        messageId: String(message._id),
        content: message.content,
        editedAt: message.editedAt,
      });
    }
  } catch {
    // Non-blocking
  }

  return message;
}

export async function deleteMessage(messageId, currentUser) {
  const message = await ChatMessage.findOne({ _id: messageId, isDeleted: false });
  if (!message) throw AppError.notFound('Message not found');

  const group = await Group.findById(message.group);
  const isSender = String(message.sender) === String(currentUser._id);
  const isTeacher = group && String(group.teacher) === String(currentUser._id);
  const isAdmin = currentUser.role === 'admin';

  if (!isSender && !isTeacher && !isAdmin) {
    throw AppError.forbidden('You do not have permission to delete this message');
  }

  message.isDeleted = true;
  message.deletedBy = currentUser._id;
  message.deletedAt = new Date();
  await message.save();

  if (isTeacher || isAdmin) {
    await AuditLog.create({
      actor: currentUser._id,
      action: AUDIT_ACTIONS.MESSAGE_DELETED,
      entity: 'ChatMessage',
      entityId: message._id,
      meta: { groupId: message.group, originalSender: message.sender },
    });
  }

  try {
    const io = getIO();
    if (io) {
      io.to(`group:${message.group}`).emit('chat:delete', {
        messageId: String(message._id),
      });
    }
  } catch {
    // Non-blocking
  }

  return { success: true, message: 'Message deleted' };
}

export async function markMessagesAsRead(groupId, userId) {
  await ChatMessage.updateMany(
    {
      group: groupId,
      'readBy.user': { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: new Date() } },
    },
  );

  try {
    const io = getIO();
    if (io) {
      io.to(`group:${groupId}`).emit('chat:read', { groupId, userId: String(userId) });
    }
  } catch {
    // Non-blocking
  }

  return { success: true };
}

export async function muteStudentInGroup(groupId, studentId, teacherId, mute = true) {
  const group = await Group.findOne({ _id: groupId, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  if (mute) {
    await Group.findByIdAndUpdate(groupId, { $addToSet: { mutedStudents: studentId } });
  } else {
    await Group.findByIdAndUpdate(groupId, { $pull: { mutedStudents: studentId } });
  }

  await AuditLog.create({
    actor: teacherId,
    action: AUDIT_ACTIONS.STUDENT_MUTED,
    entity: 'Group',
    entityId: group._id,
    meta: { studentId, muted: mute },
  });

  return { success: true, message: `Student ${mute ? 'muted' : 'unmuted'} in group chat` };
}

async function verifyChatReadAccess(groupId, currentUser) {
  if (currentUser.role === 'admin') return true;

  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  if (String(group.teacher) === String(currentUser._id)) return true;

  if (currentUser.role === 'student') {
    const isMember = await Enrollment.exists({
      group: groupId,
      student: currentUser._id,
      status: { $in: ['active', 'paused'] },
    });
    if (isMember) return true;
  }

  if (currentUser.role === 'parent') {
    const links = await ParentLink.find({ parent: currentUser._id, status: 'accepted' }).select('student');
    const childIds = links.map((l) => l.student);
    const hasChild = await Enrollment.exists({
      group: groupId,
      student: { $in: childIds },
      status: { $in: ['active', 'paused'] },
    });
    if (hasChild) return true;
  }

  throw AppError.notFound('Group chat not found');
}

export default {
  sendMessage,
  getGroupMessages,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  muteStudentInGroup,
};
