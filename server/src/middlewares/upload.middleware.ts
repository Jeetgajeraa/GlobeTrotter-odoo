import multer, { FileFilterCallback } from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import { cloudinary } from '../config/cloudinary.js';

// File filter function to accept any image type without strict format limits
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Allow all image MIME types (JPEG, PNG, WEBP, GIF, AVIF, HEIC, SVG, BMP, etc.)
  if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg|bmp|tiff)$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    // If not obviously an image, still allow it to let Cloudinary process and validate
    cb(null, true);
  }
};

/**
 * Creates a Multer upload instance that uploads directly to Cloudinary without restrictive limits
 * @param folder Subfolder name in Cloudinary (e.g. 'profiles', 'trips', 'posts', 'cities', 'activities')
 */
export const createCloudinaryUploader = (
  folder: string = 'general',
) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `globetrotter/${folder}`,
      resource_type: 'auto',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    } as any,
  });

  return multer({
    storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB generous limit
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

