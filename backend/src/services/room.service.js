import Room from '../models/Room.js';
import Group from '../models/Group.js';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import TeacherProfile from '../models/TeacherProfile.js';
import AppError from '../utils/AppError.js';
import { uploadStream, deleteAsset } from './cloudinary.service.js';
import { cloudinaryFolders } from '../config/cloudinary.js';

export async function getMyRoom(teacherId) {
  let room = await Room.findOne({ teacher: teacherId });
  if (!room) {
    // If approved teacher, auto-create room if missing
    const teacherProfile = await TeacherProfile.findOne({ user: teacherId, status: 'approved' });
    if (teacherProfile) {
      room = await Room.create({
        teacher: teacherId,
        name: 'الغرفة التعليمية',
        description: teacherProfile.bio || '',
      });
    } else {
      throw AppError.notFound('Room not found for this teacher');
    }
  }
  return room;
}

export async function updateMyRoom(teacherId, data, coverFileBuffer) {
  const room = await getMyRoom(teacherId);

  if (data.name !== undefined) room.name = data.name;
  if (data.description !== undefined) room.description = data.description;
  if (data.isActive !== undefined) room.isActive = data.isActive;

  if (coverFileBuffer) {
    const uploadResult = await uploadStream(coverFileBuffer, {
      folder: cloudinaryFolders.rooms,
      resourceType: 'image',
    });

    if (room.coverImage?.publicId) {
      deleteAsset(room.coverImage.publicId).catch(() => {});
    }

    room.coverImage = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
    };
  }

  await room.save();
  return room;
}

export async function getRoomStats(teacherId) {
  const room = await getMyRoom(teacherId);

  const [activeGroupsCount, totalGroups, teacherProfile, upcomingSessionsCount] = await Promise.all([
    Group.countDocuments({ teacher: teacherId, status: 'open', deletedAt: null }),
    Group.countDocuments({ teacher: teacherId, deletedAt: null }),
    TeacherProfile.findOne({ user: teacherId }).select('ratingAvg ratingCount'),
    Session.countDocuments({
      teacher: teacherId,
      status: 'scheduled',
      scheduledStart: { $gte: new Date() },
    }),
  ]);

  // Aggregate distinct active students across all groups
  const groups = await Group.find({ teacher: teacherId, deletedAt: null }).select('_id');
  const groupIds = groups.map((g) => g._id);

  const activeStudents = await Enrollment.distinct('student', {
    group: { $in: groupIds },
    status: 'active',
  });

  return {
    room,
    stats: {
      activeGroupsCount,
      totalGroups,
      totalActiveStudents: activeStudents.length,
      upcomingSessionsCount,
      ratingAvg: teacherProfile?.ratingAvg || 0,
      ratingCount: teacherProfile?.ratingCount || 0,
    },
  };
}

export default {
  getMyRoom,
  updateMyRoom,
  getRoomStats,
};
