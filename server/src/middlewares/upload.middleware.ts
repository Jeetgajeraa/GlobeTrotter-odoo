import multer, { FileFilterCallback } from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import { cloudinary } from '../config/cloudinary.js';

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// File filter function to allow only valid images
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WEBP, and GIF images are allowed.`
      )
    );
  }
};

/**
 * Creates a Multer upload instance that uploads directly to Cloudinary
 * @param folder Subfolder name in Cloudinary (e.g. 'profiles', 'trips', 'posts')
 * @param maxFileSizeInMB Maximum file size limit in MB (default: 5MB)
 */
export const createCloudinaryUploader = (
  folder: string = 'general',
  maxFileSizeInMB: number = 5
) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `globetrotter/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    } as any,
  });

  return multer({
    storage,
    limits: {
      fileSize: maxFileSizeInMB * 1024 * 1024,
    },
    fileFilter: imageFileFilter,
  });
};

// Ready-to-use upload middlewares
export const uploadProfilePhoto = createCloudinaryUploader('profiles');
export const uploadTripPhoto = createCloudinaryUploader('trips');
export const uploadPostPhoto = createCloudinaryUploader('posts');
export const uploadGeneral = createCloudinaryUploader('general');

export default uploadGeneral;
