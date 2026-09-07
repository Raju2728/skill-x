const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');
const router = express.Router();

// Create review for a completed session
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { sessionId, revieweeId, categories = {}, comment } = req.body;

    if (!sessionId || !revieweeId) {
      return res.status(400).json({ message: 'Session ID and Reviewee ID are required' });
    }

    // Verify session
    const session = await Session.findOne({
      _id: sessionId,
      participants: { $all: [req.user._id, revieweeId] },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found for participants' });
    }

    // Calculate overall average
    const {
      knowledge = 5,
      communication = 5,
      punctuality = 5,
      helpfulness = 5,
    } = categories;

    const overall = parseFloat(((knowledge + communication + punctuality + helpfulness) / 4).toFixed(1));

    const review = await Review.create({
      sessionId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      categories: { knowledge, communication, punctuality, helpfulness },
      overall,
      comment,
    });

    // Award bonus XP to both
    await User.findByIdAndUpdate(revieweeId, { $inc: { xp: 50 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { xp: 20 } });

    res.status(201).json({ review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this session' });
    }
    next(error);
  }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name username avatar')
      .sort('-createdAt');

    const total = reviews.length;
    const avg = total > 0
      ? parseFloat((reviews.reduce((acc, r) => acc + r.overall, 0) / total).toFixed(1))
      : 5.0;

    res.json({
      reviews,
      stats: { average: avg, totalCount: total },
    });
  } catch (error) {
    next(error);
  }
});

// Get reviews written by or received by current user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const received = await Review.find({ reviewee: req.user._id })
      .populate('reviewer', 'name username avatar')
      .sort('-createdAt');

    const written = await Review.find({ reviewer: req.user._id })
      .populate('reviewee', 'name username avatar')
      .sort('-createdAt');

    res.json({ received, written });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
