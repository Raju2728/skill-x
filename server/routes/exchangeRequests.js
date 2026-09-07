const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ExchangeRequest = require('../models/ExchangeRequest');
const Connection = require('../models/Connection');
const User = require('../models/User');
const router = express.Router();

// Create new exchange request
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { receiverId, skillsOffered = [], skillsRequested = [], message } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (receiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send exchange request to yourself' });
    }

    // Check if pending request already exists
    const existing = await ExchangeRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId, status: 'pending' },
        { sender: receiverId, receiver: req.user._id, status: 'pending' },
      ],
    });

    if (existing) {
      return res.status(409).json({ message: 'A pending exchange request already exists between you and this partner' });
    }

    const request = await ExchangeRequest.create({
      sender: req.user._id,
      receiver: receiverId,
      skillsOffered,
      skillsRequested,
      message,
      status: 'pending',
    });

    const populated = await ExchangeRequest.findById(request._id)
      .populate('sender', 'name username avatar location bio')
      .populate('receiver', 'name username avatar location bio')
      .populate('skillsOffered', 'name category')
      .populate('skillsRequested', 'name category');

    res.status(201).json({ request: populated });
  } catch (error) {
    next(error);
  }
});

// Get user's exchange requests (incoming & outgoing)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { type = 'all', status } = req.query;
    const filter = {};

    if (type === 'incoming') {
      filter.receiver = req.user._id;
    } else if (type === 'outgoing') {
      filter.sender = req.user._id;
    } else {
      filter.$or = [{ sender: req.user._id }, { receiver: req.user._id }];
    }

    if (status) {
      filter.status = status;
    }

    const requests = await ExchangeRequest.find(filter)
      .populate('sender', 'name username avatar location bio xp level')
      .populate('receiver', 'name username avatar location bio xp level')
      .populate('skillsOffered', 'name category')
      .populate('skillsRequested', 'name category')
      .sort('-createdAt');

    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

// Accept request
router.put('/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const request = await ExchangeRequest.findOne({
      _id: req.params.id,
      receiver: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending exchange request not found' });
    }

    request.status = 'accepted';
    request.respondedAt = new Date();
    if (req.body.responseMessage) request.responseMessage = req.body.responseMessage;
    await request.save();

    // Create or reactivate Connection
    let connection = await Connection.findOne({
      users: { $all: [request.sender, request.receiver] },
    });

    if (!connection) {
      connection = await Connection.create({
        users: [request.sender, request.receiver],
        exchangeRequest: request._id,
        status: 'active',
      });
    } else {
      connection.status = 'active';
      connection.exchangeRequest = request._id;
      connection.lastActivity = new Date();
      await connection.save();
    }

    // Award XP to both users
    await User.findByIdAndUpdate(request.sender, { $inc: { xp: 50 } });
    await User.findByIdAndUpdate(request.receiver, { $inc: { xp: 50 } });

    res.json({ message: 'Exchange request accepted!', connection });
  } catch (error) {
    next(error);
  }
});

// Reject request
router.put('/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const request = await ExchangeRequest.findOne({
      _id: req.params.id,
      receiver: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending exchange request not found' });
    }

    request.status = 'rejected';
    request.respondedAt = new Date();
    if (req.body.responseMessage) request.responseMessage = req.body.responseMessage;
    await request.save();

    res.json({ message: 'Exchange request declined', request });
  } catch (error) {
    next(error);
  }
});

// Cancel outgoing request
router.put('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const request = await ExchangeRequest.findOne({
      _id: req.params.id,
      sender: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending exchange request not found' });
    }

    request.status = 'cancelled';
    await request.save();

    res.json({ message: 'Exchange request cancelled', request });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
