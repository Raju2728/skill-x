const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// Helper to create and push a notification
async function createNotification({ userId, senderId, type, title, message, link, metadata, io }) {
  try {
    const notification = await Notification.create({
      userId,
      senderId,
      type,
      title,
      message,
      link,
      metadata,
    });

    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

// Get user notifications
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { limit = 30, page = 1, unreadOnly } = req.query;
    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .populate('senderId', 'name username avatar')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

// Mark single notification as read
router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Marked as read', notification });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete single notification
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!result) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.createNotification = createNotification;
