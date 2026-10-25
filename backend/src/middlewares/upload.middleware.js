import multer from 'multer';
import AppError from '../utils/AppError.js';
import { UPLOAD_LIMITS } from '../utils/constants.js';

const storage = multer.memoryStorage();

function fileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        AppError.badRequest(
          `Invalid file format: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`,
        ),
        false,
      );
    }
  };
}

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.avatar.maxSize },
  fileFilter: fileFilter(UPLOAD_LIMITS.avatar.mimes),
}).single('avatar');

export const uploadCertificates = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.certificate.maxSize },
  fileFilter: fileFilter(UPLOAD_LIMITS.certificate.mimes),
}).array('files', UPLOAD_LIMITS.certificate.maxFiles);

export const uploadChatFiles = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.attachment.maxSize },
  fileFilter: fileFilter(UPLOAD_LIMITS.attachment.mimes),
}).array('attachments', UPLOAD_LIMITS.attachment.maxFiles);

export const uploadAssignmentFiles = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.attachment.maxSize },
  fileFilter: fileFilter(UPLOAD_LIMITS.attachment.mimes),
}).array('files', UPLOAD_LIMITS.attachment.maxFiles);

export const uploadCoverImage = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.avatar.maxSize },
  fileFilter: fileFilter(UPLOAD_LIMITS.avatar.mimes),
}).single('cover');
