const { verifyToken } = require('../config/jwt');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Session = require('../models/Session');
const User = require('../models/User');
const { escapeRegex, sanitizeText } = require('../utils/sanitize');
const { createNotification } = require('../routes/notifications');

// Online users map: userId -> Set of socketIds
const onlineUsers = new Map();

// Active ringing calls: callId -> { callerId, recipientId, timer, callType, conversationId }
const activeCalls = new Map();

// Room participants map: meetingRoomId -> Map(userId -> { socketId, name, avatar, isHost, audio, video, screen })
const meetingRooms = new Map();

// Socket rate limiter map: socketId -> { count, resetTime }
const socketRateLimits = new Map();

const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_EVENTS_PER_WINDOW = 30;

function checkRateLimit(socketId) {
  const now = Date.now();
  let limit = socketRateLimits.get(socketId);
  if (!limit || now > limit.resetTime) {
    limit = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    socketRateLimits.set(socketId, limit);
    return true;
  }
  limit.count += 1;
  return limit.count <= MAX_EVENTS_PER_WINDOW;
}

module.exports = function initSocket(io) {
  // Auth middleware for Socket.IO (SEC-002 & HIGH-010)
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token && socket.handshake.headers?.cookie) {
        const match = socket.handshake.headers.cookie.match(/(^|;\s*)token=([^;]+)/);
        if (match) {
          token = match[2];
        }
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.userId.toString();
      next();
    } catch (error) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast online status
    io.emit('presence:online', { userId });

    // Join user's personal room for targeted dispatches
    socket.join(`user:${userId}`);

    // Clean up rate limit on disconnect
    socket.on('disconnect', () => {
      socketRateLimits.delete(socket.id);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('presence:offline', { userId });
        }
      }

      // Cleanup user from any active meeting rooms
      for (const [roomId, participants] of meetingRooms.entries()) {
        if (participants.has(userId)) {
          participants.delete(userId);
          socket.to(`meeting:${roomId}`).emit('meeting:participant-left', { userId });
          if (participants.size === 0) {
            meetingRooms.delete(roomId);
          }
        }
      }

      // Cleanup any active ringing calls where user was caller or recipient
      for (const [callId, callInfo] of activeCalls.entries()) {
        if (callInfo.callerId === userId || callInfo.recipientId === userId) {
          clearTimeout(callInfo.timer);
          const otherUserId = callInfo.callerId === userId ? callInfo.recipientId : callInfo.callerId;
          io.to(`user:${otherUserId}`).emit('call:ended', {
            callId,
            reason: 'User disconnected',
          });
          activeCalls.delete(callId);
        }
      }
    });

    // Rate-limit wrapper
    socket.use(([event, ...args], next) => {
      if (!checkRateLimit(socket.id)) {
        console.warn(`[RATE LIMIT] Socket ${socket.id} exceeded event rate on '${event}'`);
        socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
        return;
      }
      next();
    });

    // --- Messaging (with Participant Authorization SEC-004) ---
    socket.on('message:send', async (data) => {
      const { conversationId, recipientId, message } = data || {};

      if (!conversationId || !message) {
        return socket.emit('error', { message: 'Missing conversationId or message payload' });
      }

      try {
        // SEC-004: Validate conversation membership before persisting or broadcasting
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit('error', {
            message: 'Unauthorized: You are not a participant in this conversation',
          });
        }

        // Verify recipient is actually in the conversation
        const targetRecipientId = recipientId || conversation.participants.find(p => p.toString() !== userId)?.toString();
        if (!targetRecipientId || !conversation.participants.some(p => p.toString() === targetRecipientId)) {
          return socket.emit('error', { message: 'Invalid recipient for conversation' });
        }

        // Persist message to database
        const savedMessage = await Message.create({
          conversationId,
          senderId: userId,
          recipientId: targetRecipientId,
          ciphertext: message.ciphertext || '',
          nonce: message.nonce || '',
          keyVersion: message.keyVersion || 1,
          messageType: message.messageType || 'text',
          fileMetadata: message.fileMetadata || undefined,
          deliveryStatus: 'sent',
        });

        // Update conversation's last message and activity
        conversation.lastMessage = {
          senderId: userId,
          ciphertext: message.ciphertext || '',
          type: message.messageType || 'text',
          timestamp: savedMessage.timestamp,
        };
        conversation.lastActivity = new Date();

        if (!conversation.unreadCounts) conversation.unreadCounts = new Map();
        const currentUnread = conversation.unreadCounts.get(targetRecipientId) || 0;
        conversation.unreadCounts.set(targetRecipientId, currentUnread + 1);
        await conversation.save();

        const persistedMsg = savedMessage.toJSON();

        // Notify sender of persistence
        socket.emit('message:persisted', {
          conversationId,
          tempTimestamp: message.timestamp,
          message: persistedMsg,
        });

        // Forward to recipient
        io.to(`user:${targetRecipientId}`).emit('message:receive', {
          conversationId,
          message: { ...persistedMsg, senderId: userId },
        });

        // If recipient is online, acknowledge delivery
        if (onlineUsers.has(targetRecipientId)) {
          savedMessage.deliveryStatus = 'delivered';
          await savedMessage.save();
          socket.emit('message:delivered', { messageId: savedMessage._id.toString() });
        }
      } catch (err) {
        console.error('Failed to persist or deliver message:', err);
        socket.emit('error', { message: 'Message delivery failed' });
      }
    });

    socket.on('message:delivered', ({ messageId, senderId }) => {
      if (senderId) {
        io.to(`user:${senderId}`).emit('message:delivered', { messageId });
      }
    });

    socket.on('message:read', async ({ conversationId, senderId }) => {
      try {
        await Message.updateMany(
          { conversationId, senderId, recipientId: userId, deliveryStatus: { $ne: 'read' } },
          { deliveryStatus: 'read' }
        );

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (conversation && conversation.unreadCounts) {
          conversation.unreadCounts.set(userId, 0);
          await conversation.save();
        }

        if (senderId) {
          io.to(`user:${senderId}`).emit('message:read', { conversationId, readBy: userId });
        }
      } catch (err) {
        console.error('Failed to update read status:', err);
      }
    });

    socket.on('typing:start', ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('typing:start', { conversationId, userId });
      }
    });

    socket.on('typing:stop', ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('typing:stop', { conversationId, userId });
      }
    });

    // --- Voice/Video 1-on-1 Calls (HIGH-007, HIGH-009) ---
    socket.on('call:request', async ({ recipientId, callType = 'voice', conversationId }) => {
      if (!recipientId || recipientId === userId) {
        return socket.emit('call:error', { message: 'Invalid call recipient' });
      }

      const callId = `call_${userId}_${recipientId}_${Date.now()}`;

      // Fetch caller information for incoming call dialog
      let callerName = 'Skill X User';
      let callerAvatar = '';
      try {
        const callerDoc = await User.findById(userId).select('name username avatar');
        if (callerDoc) {
          callerName = callerDoc.name || callerDoc.username;
          callerAvatar = callerDoc.avatar || '';
        }
      } catch (e) {}

      // Ringing timeout (30 seconds) HIGH-007
      const timer = setTimeout(() => {
        if (activeCalls.has(callId)) {
          activeCalls.delete(callId);
          socket.emit('call:timeout', { callId, message: 'Recipient did not answer' });
          io.to(`user:${recipientId}`).emit('call:timeout', { callId, message: 'Missed call' });

          // Log missed call in conversation if applicable
          if (conversationId) {
            Message.create({
              conversationId,
              senderId: userId,
              recipientId,
              ciphertext: '__CALL_MISSED__',
              nonce: `call_missed_${Date.now()}`,
              messageType: 'system',
              deliveryStatus: 'sent',
            }).catch(() => {});
          }
        }
      }, 30000);

      activeCalls.set(callId, {
        callerId: userId,
        recipientId,
        timer,
        callType,
        conversationId,
        status: 'ringing',
      });

      // Notify recipient with full caller metadata
      io.to(`user:${recipientId}`).emit('call:incoming', {
        callId,
        callerId: userId,
        callerName,
        callerAvatar,
        callType,
        conversationId,
      });

      // Acknowledge caller that ringing started
      socket.emit('call:ringing', { callId, recipientId });
    });

    socket.on('call:accept', async ({ callId }) => {
      const callInfo = activeCalls.get(callId);
      if (!callInfo) return;

      clearTimeout(callInfo.timer);
      callInfo.status = 'connected';

      io.to(`user:${callInfo.callerId}`).emit('call:accepted', {
        callId,
        acceptedBy: userId,
      });

      // System log for call start
      if (callInfo.conversationId) {
        try {
          const callMsg = await Message.create({
            conversationId: callInfo.conversationId,
            senderId: callInfo.callerId,
            recipientId: callInfo.recipientId,
            ciphertext: '__CALL_CONNECTED__',
            nonce: `call_started_${Date.now()}`,
            messageType: 'system',
            deliveryStatus: 'sent',
          });
          const sys = {
            ...callMsg.toJSON(),
            callAction: 'started',
            plaintext: `${callInfo.callType === 'video' ? '📹 Video' : '📞 Voice'} call connected`,
          };
          io.to(`user:${callInfo.callerId}`).emit('message:receive', { conversationId: callInfo.conversationId, message: sys });
          io.to(`user:${callInfo.recipientId}`).emit('message:receive', { conversationId: callInfo.conversationId, message: sys });
        } catch (e) {}
      }
    });

    socket.on('call:reject', async ({ callId, reason = 'declined' }) => {
      const callInfo = activeCalls.get(callId);
      if (!callInfo) return;

      clearTimeout(callInfo.timer);
      activeCalls.delete(callId);

      io.to(`user:${callInfo.callerId}`).emit('call:rejected', {
        callId,
        rejectedBy: userId,
        reason,
      });

      // System log for declined call
      if (callInfo.conversationId) {
        try {
          const callMsg = await Message.create({
            conversationId: callInfo.conversationId,
            senderId: userId,
            recipientId: callInfo.callerId,
            ciphertext: '__CALL_DECLINED__',
            nonce: `call_declined_${Date.now()}`,
            messageType: 'system',
            deliveryStatus: 'sent',
          });
          const sys = {
            ...callMsg.toJSON(),
            callAction: 'declined',
            plaintext: `📞 Call declined`,
          };
          io.to(`user:${callInfo.callerId}`).emit('message:receive', { conversationId: callInfo.conversationId, message: sys });
          io.to(`user:${userId}`).emit('message:receive', { conversationId: callInfo.conversationId, message: sys });
        } catch (e) {}
      }
    });

    socket.on('call:end', async ({ callId, duration = 0 }) => {
      let callInfo = activeCalls.get(callId);
      if (callInfo) {
        clearTimeout(callInfo.timer);
        activeCalls.delete(callId);
      }

      const otherUserId = callInfo ? (callInfo.callerId === userId ? callInfo.recipientId : callInfo.callerId) : null;
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit('call:ended', {
          callId,
          endedBy: userId,
          duration,
        });

        if (callInfo.conversationId) {
          try {
            const durationText = duration
              ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`
              : '';
            const callMsg = await Message.create({
              conversationId: callInfo.conversationId,
              senderId: userId,
              recipientId: otherUserId,
              ciphertext: '__CALL_ENDED__',
              nonce: `call_ended_${Date.now()}`,
              messageType: 'system',
              deliveryStatus: 'sent',
            });
            const sys = {
              ...callMsg.toJSON(),
              callAction: 'ended',
              plaintext: `📞 Call ended${durationText}`,
            };
            io.to(`user:${userId}`).emit('message:receive', { conversationId: callInfo.conversationId, message: sys });
            io.to(`user:${otherUserId}`).emit('message:receive', { conversationId: callInfo.conversationId, message: sys });
          } catch (e) {}
        }
      }
    });

    // --- 1-to-1 WebRTC Signaling ---
    socket.on('webrtc:offer', ({ recipientId, offer }) => {
      io.to(`user:${recipientId}`).emit('webrtc:offer', { senderId: userId, offer });
    });

    socket.on('webrtc:answer', ({ recipientId, answer }) => {
      io.to(`user:${recipientId}`).emit('webrtc:answer', { senderId: userId, answer });
    });

    socket.on('webrtc:ice-candidate', ({ recipientId, candidate }) => {
      io.to(`user:${recipientId}`).emit('webrtc:ice-candidate', { senderId: userId, candidate });
    });

    // --- Video Meeting Rooms (Multi-User Mesh & Host Moderation) ---
    socket.on('meeting:join', async ({ sessionId }) => {
      if (!sessionId) return;

      try {
        // Fetch session to verify access and host role
        const session = await Session.findOne({
          $or: [{ _id: sessionId.length === 24 ? sessionId : null }, { meetingRoomId: sessionId }],
        });

        const isHost = session ? session.creator.toString() === userId : false;

        // Fetch user profile info
        const userDoc = await User.findById(userId).select('name username avatar');
        const participantInfo = {
          userId,
          name: userDoc?.name || userDoc?.username || 'User',
          avatar: userDoc?.avatar || '',
          isHost,
          audio: true,
          video: true,
          screen: false,
        };

        const roomKey = sessionId;
        if (!meetingRooms.has(roomKey)) {
          meetingRooms.set(roomKey, new Map());
        }

        const roomMap = meetingRooms.get(roomKey);
        roomMap.set(userId, participantInfo);

        socket.join(`meeting:${roomKey}`);

        // Send existing participants roster to newly joined participant
        const existingParticipants = Array.from(roomMap.values()).filter(p => p.userId !== userId);
        socket.emit('meeting:roster', {
          sessionId: roomKey,
          participants: existingParticipants,
          isHost,
        });

        // Notify existing room participants of the new arrival
        socket.to(`meeting:${roomKey}`).emit('meeting:participant-joined', participantInfo);
      } catch (err) {
        console.error('Error joining meeting room:', err);
      }
    });

    socket.on('meeting:leave', ({ sessionId }) => {
      if (!sessionId) return;
      socket.leave(`meeting:${sessionId}`);

      const roomMap = meetingRooms.get(sessionId);
      if (roomMap) {
        roomMap.delete(userId);
        if (roomMap.size === 0) {
          meetingRooms.delete(sessionId);
        }
      }

      socket.to(`meeting:${sessionId}`).emit('meeting:participant-left', { userId });
    });

    // Mesh WebRTC signaling for multi-user meetings
    socket.on('meeting:signal', ({ sessionId, targetUserId, signalType, payload }) => {
      if (!sessionId || !targetUserId || !signalType) return;
      // Target signal to specific peer within meeting room
      io.to(`user:${targetUserId}`).emit('meeting:signal', {
        sessionId,
        fromUserId: userId,
        signalType,
        payload,
      });
    });

    socket.on('meeting:media-state', ({ sessionId, audio, video, screen }) => {
      const roomMap = meetingRooms.get(sessionId);
      if (roomMap && roomMap.has(userId)) {
        const info = roomMap.get(userId);
        if (audio !== undefined) info.audio = audio;
        if (video !== undefined) info.video = video;
        if (screen !== undefined) info.screen = screen;
      }
      socket.to(`meeting:${sessionId}`).emit('meeting:media-state', {
        userId, audio, video, screen,
      });
    });

    // In-Meeting Chat (Authorized & Sanitized HIGH-008)
    socket.on('meeting:chat', async ({ sessionId, text }) => {
      if (!sessionId || !text || typeof text !== 'string') return;

      // Verify socket is actually in the meeting room
      if (!socket.rooms.has(`meeting:${sessionId}`)) {
        return socket.emit('error', { message: 'Unauthorized: not in meeting room' });
      }

      const userDoc = await User.findById(userId).select('name username avatar');
      const sanitized = sanitizeText(text);
      if (!sanitized) return;

      const chatMsg = {
        id: `mchat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        userId,
        senderName: userDoc?.name || userDoc?.username || 'Participant',
        avatar: userDoc?.avatar || '',
        text: sanitized,
        timestamp: new Date().toISOString(),
      };

      io.to(`meeting:${sessionId}`).emit('meeting:chat', chatMsg);
    });

    // Host Moderation Controls (Req-6)
    socket.on('meeting:mute-participant', async ({ sessionId, targetUserId }) => {
      const roomMap = meetingRooms.get(sessionId);
      const requester = roomMap?.get(userId);
      if (!requester || !requester.isHost) {
        return socket.emit('error', { message: 'Only meeting hosts can mute participants' });
      }

      io.to(`user:${targetUserId}`).emit('meeting:force-mute', { byHost: true });
    });

    socket.on('meeting:kick-participant', async ({ sessionId, targetUserId }) => {
      const roomMap = meetingRooms.get(sessionId);
      const requester = roomMap?.get(userId);
      if (!requester || !requester.isHost) {
        return socket.emit('error', { message: 'Only meeting hosts can remove participants' });
      }

      io.to(`user:${targetUserId}`).emit('meeting:kicked', { reason: 'Removed by host' });
      if (roomMap) roomMap.delete(targetUserId);
      socket.to(`meeting:${sessionId}`).emit('meeting:participant-left', { userId: targetUserId });
    });

    socket.on('meeting:end-for-all', async ({ sessionId }) => {
      const roomMap = meetingRooms.get(sessionId);
      const requester = roomMap?.get(userId);
      if (!requester || !requester.isHost) {
        return socket.emit('error', { message: 'Only meeting hosts can end the meeting for all' });
      }

      io.to(`meeting:${sessionId}`).emit('meeting:ended', { byHost: true });
      meetingRooms.delete(sessionId);
    });

    // --- Real-time Synchronized Meeting Notes ---
    socket.on('note:update', ({ sessionId, content }) => {
      if (!socket.rooms.has(`meeting:${sessionId}`)) return;
      socket.to(`meeting:${sessionId}`).emit('note:update', { userId, content });
    });
  });

  return io;
};
