const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Connection = require('../models/Connection');
const User = require('../models/User');
const UserSkill = require('../models/UserSkill');
const router = express.Router();

// Get all active / archived connections for current user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;
    const filter = {
      users: req.user._id,
    };
    if (status !== 'all') {
      filter.status = status;
    }

    const connections = await Connection.find(filter)
      .populate('users', 'name username avatar bio location xp level lastSeen privacySettings')
      .populate({
        path: 'exchangeRequest',
        populate: [
          { path: 'skillsOffered', select: 'name category' },
          { path: 'skillsRequested', select: 'name category' },
        ],
      })
      .sort('-lastActivity');

    // Enrich with partner user and their skills
    const enriched = await Promise.all(connections.map(async (conn) => {
      const partner = conn.users.find(u => u._id.toString() !== req.user._id.toString());
      if (!partner) return conn.toJSON();

      const partnerSkills = await UserSkill.find({ userId: partner._id }).populate('skillId');
      return {
        ...conn.toJSON(),
        partner: {
          ...partner.toJSON(),
          teachSkills: partnerSkills.filter(s => s.type === 'teach'),
          learnSkills: partnerSkills.filter(s => s.type === 'learn'),
        },
      };
    }));

    res.json({ connections: enriched });
  } catch (error) {
    next(error);
  }
});

// Get single connection by ID
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.id,
      users: req.user._id,
    })
      .populate('users', 'name username avatar bio location xp level lastSeen')
      .populate('exchangeRequest');

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const partner = connection.users.find(u => u._id.toString() !== req.user._id.toString());
    const partnerSkills = await UserSkill.find({ userId: partner._id }).populate('skillId');

    res.json({
      connection: {
        ...connection.toJSON(),
        partner: {
          ...partner.toJSON(),
          teachSkills: partnerSkills.filter(s => s.type === 'teach'),
          learnSkills: partnerSkills.filter(s => s.type === 'learn'),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update connection status (e.g. pause, archive)
router.put('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const connection = await Connection.findOneAndUpdate(
      { _id: req.params.id, users: req.user._id },
      { status },
      { new: true }
    );

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    res.json({ connection });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
