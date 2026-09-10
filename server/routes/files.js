const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const File = require('../models/File');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Allowed MIME types and extensions whitelist
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.txt', '.md', '.doc', '.docx'
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('File extension not allowed. Supported formats: images (JPG, PNG, WEBP, GIF), documents (PDF, DOC, DOCX, TXT, MD)'));
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('File MIME type not permitted'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB safe limit
  fileFilter,
});

// Upload middleware with custom error handling
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds maximum allowed limit of 10MB' });
      }
      return res.status(400).json({ message: err.message || 'File upload validation failed' });
    }
    next();
  });
};

// Upload a file (Meeting attachment or chat file)
router.post('/', requireAuth, handleUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { sessionId, conversationId } = req.body;

    const fileDoc = await File.create({
      uploaderId: req.user._id,
      sessionId: sessionId || undefined,
      conversationId: conversationId || undefined,
      name: req.file.originalname,
      path: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      file: fileDoc,
      url: fileUrl,
    });
  } catch (error) {
    next(error);
  }
});

// Get session files
router.get('/session/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const files = await File.find({ sessionId: req.params.sessionId })
      .populate('uploaderId', 'name username avatar')
      .sort('-createdAt');

    const enriched = files.map(f => ({
      ...f.toJSON(),
      url: `/uploads/${f.path}`,
    }));

    res.json({ files: enriched });
  } catch (error) {
    next(error);
  }
});

// Download a file with attachment header and original name
router.get('/download/:filename', (req, res, next) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    const downloadName = req.query.name || safeFilename;
    res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
