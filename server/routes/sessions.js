const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const Session = require('../models/Session');
const SessionNote = require('../models/SessionNote');
const User = require('../models/User');
const Connection = require('../models/Connection');
const router = express.Router();

// Get all sessions for current user (upcoming, past, today)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, month, year } = req.query;
    const filter = {
      participants: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.startTime = { $gte: startDate, $lte: endDate };
    }

    const sessions = await Session.find(filter)
      .populate('creator', 'name username avatar')
      .populate('participants', 'name username avatar')
      .populate('skill', 'name category')
      .sort('startTime');

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

// Create new scheduled session
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      title,
      skillId,
      participantId,
      startTime,
      endTime,
      durationMinutes = 60,
      meetingMode = 'video',
      topicDescription,
    } = req.body;

    if (!title || !startTime || !endTime || !participantId) {
      return res.status(400).json({ message: 'Title, participant, and start/end times are required' });
    }

    const participants = [req.user._id, participantId];

    // Conflict detection for participants
    const conflict = await Session.findOne({
      participants: { $in: participants },
      status: { $in: ['scheduled', 'in-progress'] },
      $or: [
        { startTime: { $lt: new Date(endTime), $gte: new Date(startTime) } },
        { endTime: { $gt: new Date(startTime), $lte: new Date(endTime) } },
      ],
    });

    if (conflict) {
      return res.status(409).json({ message: 'Time conflict: A participant already has a scheduled session during this time slot' });
    }

    const meetingRoomId = `skillx-room-${uuidv4()}`;

    const session = await Session.create({
      title,
      skill: skillId || undefined,
      creator: req.user._id,
      participants,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationMinutes,
      meetingMode,
      topicDescription,
      meetingRoomId,
      status: 'scheduled',
    });

    // Initialize session notes
    await SessionNote.create({
      sessionId: session._id,
      content: `# ${title}\n\n### Learning Objectives\n- \n\n### Meeting Notes\n\n### Action Items\n- [ ] `,
    });

    const populated = await Session.findById(session._id)
      .populate('creator', 'name username avatar')
      .populate('participants', 'name username avatar')
      .populate('skill', 'name category');

    res.status(201).json({ session: populated });
  } catch (error) {
    next(error);
  }
});

// Get session details + notes
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      participants: req.user._id,
    })
      .populate('creator', 'name username avatar bio')
      .populate('participants', 'name username avatar bio')
      .populate('skill', 'name category');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const note = await SessionNote.findOne({ sessionId: session._id });

    res.json({ session, note });
  } catch (error) {
    next(error);
  }
});

// Update session note content
router.put('/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const note = await SessionNote.findOneAndUpdate(
      { sessionId: session._id },
      { content: req.body.content, lastEditor: req.user._id },
      { upsert: true, new: true }
    );

    res.json({ note });
  } catch (error) {
    next(error);
  }
});

// Complete session (awards XP and updates connection total hours)
router.put('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'completed';
    await session.save();

    // Increment sessionCount and hours on connection
    const hours = (session.durationMinutes || 60) / 60;
    await Connection.findOneAndUpdate(
      { users: { $all: session.participants } },
      {
        $inc: { sessionCount: 1, totalHoursExchanged: hours },
        $set: { lastActivity: new Date() },
      }
    );

    // Award XP to both participants
    for (const pId of session.participants) {
      const user = await User.findById(pId);
      if (user) {
        user.xp = (user.xp || 0) + 100;
        user.calculateLevel();
        await user.save();
      }
    }

    res.json({ message: 'Session completed successfully', session });
  } catch (error) {
    next(error);
  }
});

// Cancel session
router.put('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'cancelled';
    await session.save();

    res.json({ message: 'Session cancelled', session });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
