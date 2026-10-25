import { v2 as cloudinary } from 'cloudinary';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import logger from '../utils/logger.js';

/**
 * Uploads a file buffer directly to Cloudinary via upload_stream.
 */
export async function uploadStream(
  buffer,
  {
    folder,
    resourceType = 'auto',
    transformation,
    type = 'upload',
  } = {},
) {
  if (!isCloudinaryConfigured) {
    logger.warn('Cloudinary not configured. Mocking file upload.');
    return {
      url: `https://fake-cdn.elbedawy-academy.com/${folder}/${Date.now()}`,
      publicId: `fake_${Date.now()}`,
      resourceType,
      bytes: buffer?.length || 0,
      format: 'png',
    };
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      type,
    };
    if (transformation) uploadOptions.transformation = transformation;

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error(`Cloudinary upload failed: ${error.message}`);
        return reject(error);
      }
      resolve({
        url: result.secure_url || result.url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        bytes: result.bytes,
        format: result.format,
      });
    });

    stream.end(buffer);
  });
}

/**
 * Deletes an asset by public_id from Cloudinary.
 */
export async function deleteAsset(publicId, { resourceType = 'image', type = 'upload' } = {}) {
  if (!isCloudinaryConfigured || !publicId || publicId.startsWith('fake_')) {
    return true;
  }
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type,
    });
    return result.result === 'ok';
  } catch (err) {
    logger.error(`Failed to delete Cloudinary asset ${publicId}: ${err.message}`);
    return false;
  }
}

/**
 * Generates an authenticated signed URL for private assets (e.g. teacher certificates).
 */
export function getAuthenticatedDownloadUrl(publicId, format = 'pdf') {
  if (!isCloudinaryConfigured) {
    return `https://fake-cdn.elbedawy-academy.com/private/${publicId}`;
  }
  return cloudinary.utils.private_download_url(publicId, format, {
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour validity
  });
}
