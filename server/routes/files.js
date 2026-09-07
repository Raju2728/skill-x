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

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Upload a file (Meeting attachment or chat file)
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
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

module.exports = router;
