import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';

export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const cloudinaryFolders = {
  avatars: `${env.CLOUDINARY_FOLDER}/avatars`,
  certificates: `${env.CLOUDINARY_FOLDER}/teacher-certificates`,
  chat: `${env.CLOUDINARY_FOLDER}/chat`,
  homework: `${env.CLOUDINARY_FOLDER}/homework`,
  rooms: `${env.CLOUDINARY_FOLDER}/rooms`,
};

export default cloudinary;
