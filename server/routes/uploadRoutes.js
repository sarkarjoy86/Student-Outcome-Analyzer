import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure Multer memory storage and validation
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/octet-stream', 'binary/octet-stream', 'image/x-png', 'image/pjpeg'];

  if (mime.startsWith('image/') || allowedMimeTypes.includes(mime) || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
    cb(null, true);
  } else {
    // Accept pasted clipboard image files safely
    cb(null, true);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Helper wrapper to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, filename) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not defined on the server.');
  }

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
  upload.any()(req, res, (err) => {
    if (err) {
      console.warn('[Upload Route] Multer warning:', err.message);
    }
    next();
  });
}, async (req, res) => {
  try {
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    // 1. If uploaded as FormData file
    if (file && file.buffer) {
      const clientFilename = req.headers['x-filename'] || 'upload';
      const randSuffix = Math.random().toString(36).substring(2, 6);
      const uniqueFilename = `${clientFilename}_${randSuffix}`;

      const result = await uploadToCloudinary(file.buffer, uniqueFilename);
      return res.status(200).json({
        success: true,
        url: result.secure_url,
        secureUrl: result.secure_url,
        publicId: result.public_id
      });
    }

    // 2. If uploaded as base64 payload in body (for pasted images)
    const base64Data = req.body?.base64 || req.body?.dataUrl || req.body?.image;
    if (base64Data && typeof base64Data === 'string') {
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const clientFilename = req.headers['x-filename'] || req.body?.filename || 'pasted_image';
      const randSuffix = Math.random().toString(36).substring(2, 6);
      const uniqueFilename = `${clientFilename}_${randSuffix}`;

      const result = await uploadToCloudinary(buffer, uniqueFilename);
      return res.status(200).json({
        success: true,
        url: result.secure_url,
        secureUrl: result.secure_url,
        publicId: result.public_id
      });
    }

    return res.status(400).json({ message: 'No image file or base64 data provided.' });
  } catch (error) {
    console.error('[Upload Route Error]:', error);
    res.status(500).json({ message: 'Cloudinary upload failed.', error: error.message });
  }
});

export default router;
