const express = require('express');
const { requireAuth } = require('../middleware/auth');
const LearningGoal = require('../models/LearningGoal');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Session = require('../models/Session');
const router = express.Router();

// Get all learning goals for current user
router.get('/goals', requireAuth, async (req, res, next) => {
  try {
    const goals = await LearningGoal.find({ userId: req.user._id })
      .populate('skill', 'name category')
      .sort('-createdAt');

    res.json({ goals });
  } catch (error) {
    next(error);
  }
});

// Create new learning goal
router.post('/goals', requireAuth, async (req, res, next) => {
  try {
    const { title, skillId, targetLevel, milestones = [], targetDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Goal title is required' });
    }

    const goal = await LearningGoal.create({
      userId: req.user._id,
      title,
      skill: skillId || undefined,
      targetLevel: targetLevel || 'intermediate',
      milestones: milestones.map(m => typeof m === 'string' ? { title: m, completed: false } : m),
      targetDate: targetDate ? new Date(targetDate) : undefined,
    });

    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
});

// Update learning goal or toggle milestone
router.put('/goals/:id', requireAuth, async (req, res, next) => {
  try {
    const { milestones, status, progressPercent } = req.body;
    const goal = await LearningGoal.findOne({ _id: req.params.id, userId: req.user._id });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    if (milestones) {
      goal.milestones = milestones;
      const completedCount = milestones.filter(m => m.completed).length;
      goal.progressPercent = milestones.length > 0
        ? Math.round((completedCount / milestones.length) * 100)
        : 0;

      if (goal.progressPercent === 100) {
        goal.status = 'completed';
        // Award completion XP
        req.user.xp = (req.user.xp || 0) + 150;
        req.user.calculateLevel();
        await req.user.save();
      }
    }

    if (status) goal.status = status;
    if (progressPercent !== undefined) goal.progressPercent = progressPercent;

    await goal.save();
    res.json({ goal });
  } catch (error) {
    next(error);
  }
});

// Get comprehensive learning progress overview
router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const [goals, sessions, connections] = await Promise.all([
      LearningGoal.find({ userId: req.user._id }),
      Session.find({ participants: req.user._id, status: 'completed' }),
      Connection.find({ users: req.user._id, status: 'active' }),
    ]);

    const totalHours = sessions.reduce((acc, s) => acc + ((s.durationMinutes || 60) / 60), 0);
    const completedGoals = goals.filter(g => g.status === 'completed').length;

    res.json({
      progress: {
        xp: req.user.xp || 0,
        level: req.user.level || 1,
        totalSessionsCompleted: sessions.length,
        totalHoursLearned: parseFloat(totalHours.toFixed(1)),
        activePartnerships: connections.length,
        totalGoals: goals.length,
        completedGoals,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
