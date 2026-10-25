import AppError from '../utils/AppError.js';
import TeacherProfile from '../models/TeacherProfile.js';

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        AppError.forbidden('You do not have permission to perform this action', 'PERMISSION_DENIED'),
      );
    }
    next();
  };
};

/**
 * Ensures teacher has an 'approved' status. Pending or suspended teachers cannot perform full teaching actions.
 */
export const requireApprovedTeacher = async (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'teacher') {
    return next(AppError.forbidden('Only teachers can access this resource'));
  }

  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile || profile.status !== 'approved') {
    return next(
      AppError.forbidden(
        'Teacher account is pending approval or not approved',
        'TEACHER_NOT_APPROVED',
      ),
    );
  }

  req.teacherProfile = profile;
  next();
};
