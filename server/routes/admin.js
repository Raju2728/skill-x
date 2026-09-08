const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Session = require('../models/Session');
const Connection = require('../models/Connection');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const { escapeRegex } = require('../utils/sanitize');
const router = express.Router();

router.use(requireAuth, requireAdmin);

// Helper for audit logging
const logAudit = async (actorId, action, targetType, targetId, metadata) => {
  try {
    await AuditLog.create({
      actor: actorId,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch (err) {
    console.error('Audit log failure:', err);
  }
};

// Platform Analytics & Metrics
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalSkills,
      totalSessions,
      completedSessions,
      activeConnections,
      pendingReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      Skill.countDocuments(),
      Session.countDocuments(),
      Session.countDocuments({ status: 'completed' }),
      Connection.countDocuments({ status: 'active' }),
      Report.countDocuments({ status: 'pending' }),
    ]);

    // Skill popularity distribution
    const topSkills = await Skill.find().sort('-popularity').limit(6);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalSkills,
        totalSessions,
        completedSessions,
        activeConnections,
        pendingReports,
        topSkills,
      },
    });
  } catch (error) {
    next(error);
  }
});

// User Management (search, filter, suspend, change role)
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, role } = req.query;
    const filter = {};

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (role) filter.role = role;

    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort('-createdAt');

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await logAudit(req.user._id, `UPDATE_USER_${status || role}`, 'user', user._id, updates);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Skill Catalog Management
router.get('/skills', async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
    if (category) filter.category = category;

    const skills = await Skill.find(filter).sort('-popularity');
    res.json({ skills });
  } catch (error) {
    next(error);
  }
});

router.post('/skills', async (req, res, next) => {
  try {
    const skill = await Skill.create(req.body);
    await logAudit(req.user._id, 'CREATE_SKILL', 'skill', skill._id, req.body);
    res.status(201).json({ skill });
  } catch (error) {
    next(error);
  }
});

router.put('/skills/:id', async (req, res, next) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAudit(req.user._id, 'UPDATE_SKILL', 'skill', skill._id, req.body);
    res.json({ skill });
  } catch (error) {
    next(error);
  }
});

router.delete('/skills/:id', async (req, res, next) => {
  try {
    await Skill.findByIdAndDelete(req.params.id);
    await logAudit(req.user._id, 'DELETE_SKILL', 'skill', req.params.id);
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Moderation & Reports
router.get('/reports', async (req, res, next) => {
  try {
    const { status = 'all' } = req.query;
    const filter = {};
    if (status !== 'all') filter.status = status;

    const reports = await Report.find(filter)
      .populate('reporter', 'name username avatar email')
      .populate('resolvedBy', 'name username')
      .sort('-createdAt');

    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

router.put('/reports/:id', async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolutionNotes,
        resolvedBy: req.user._id,
      },
      { new: true }
    );

    await logAudit(req.user._id, 'RESOLVE_REPORT', 'report', report._id, { status, resolutionNotes });
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

// Audit Logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name username email avatar')
      .sort('-createdAt')
      .limit(100);

    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
