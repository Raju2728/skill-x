const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const router = express.Router();

// Get all conversations for current user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name username avatar bio lastSeen privacySettings')
      .sort('-lastActivity');

    // Format with partner object
    const enriched = conversations.map(c => {
      const partner = c.participants.find(p => p._id.toString() !== req.user._id.toString());
      return {
        ...c.toJSON(),
        partner,
        unreadCount: c.unreadCounts?.get(req.user._id.toString()) || 0,
      };
    });

    res.json({ conversations: enriched });
  } catch (error) {
    next(error);
  }
});

// Create or get existing conversation with a partner
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
    }).populate('participants', 'name username avatar bio lastSeen privacySettings');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
        lastActivity: new Date(),
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name username avatar bio lastSeen privacySettings');
    }

    const partner = conversation.participants.find(p => p._id.toString() !== req.user._id.toString());

    res.status(201).json({
      conversation: {
        ...conversation.toJSON(),
        partner,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get messages in a conversation
router.get('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query;
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const filter = { conversationId: req.params.id };
    if (before) {
      filter.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .sort('-timestamp')
      .limit(Number(limit));

    // Reset unread count for current user
    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    res.json({ messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
});

// Post a message (fallback/API endpoint if socket is reconnecting)
router.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { ciphertext, nonce, messageType = 'text', keyVersion = 1, fileMetadata } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const recipientId = conversation.participants.find(p => p.toString() !== req.user._id.toString());

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      recipientId,
      ciphertext,
      nonce,
      keyVersion,
      messageType,
      fileMetadata,
      deliveryStatus: 'sent',
    });

    // Update last message in conversation
    conversation.lastMessage = {
      senderId: req.user._id,
      ciphertext,
      type: messageType,
      timestamp: message.timestamp,
    };
    conversation.lastActivity = new Date();

    const currentUnread = conversation.unreadCounts?.get(recipientId.toString()) || 0;
    conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
    await conversation.save();

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
