import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure Multer memory storage and validation
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only PNG, JPG, JPEG, GIF, WEBP, and SVG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Helper wrapper to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, filename) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'question-papers',
        public_id: filename,
        overwrite: true,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// POST /api/upload/image
router.post('/upload/image', requireAuth, (req, res, next) => {
  upload.single('UploadFiles')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Retrieve filename from header and append a short unique hash
    const clientFilename = req.headers['x-filename'] || 'upload';
    const randSuffix = Math.random().toString(36).substring(2, 6);
    const uniqueFilename = `${clientFilename}_${randSuffix}`;

    const result = await uploadToCloudinary(req.file.buffer, uniqueFilename);
    res.status(200).json({
      success: true,
      url: result.secure_url,
      secureUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    res.status(500).json({ message: 'Cloudinary upload failed.', error: error.message });
  }
});

export default router;
