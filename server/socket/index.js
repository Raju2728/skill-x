const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Online users map: userId -> Set of socketIds
const onlineUsers = new Map();

module.exports = function initSocket(io) {
  // Auth middleware for Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId}`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast online status
    io.emit('presence:online', { userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // --- Messaging ---
    socket.on('message:send', async (data) => {
      const { conversationId, recipientId, message } = data;

      try {
        // Persist the encrypted message to MongoDB
        const savedMessage = await Message.create({
          conversationId,
          senderId: userId,
          recipientId,
          ciphertext: message.ciphertext,
          nonce: message.nonce,
          keyVersion: message.keyVersion || 1,
          messageType: message.messageType || 'text',
          fileMetadata: message.fileMetadata || undefined,
          deliveryStatus: 'sent',
        });

        // Update conversation's last message and activity
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.lastMessage = {
            senderId: userId,
            ciphertext: message.ciphertext,
            type: message.messageType || 'text',
            timestamp: savedMessage.timestamp,
          };
          conversation.lastActivity = new Date();

          // Increment unread count for recipient
          const currentUnread = conversation.unreadCounts?.get(recipientId.toString()) || 0;
          if (!conversation.unreadCounts) conversation.unreadCounts = new Map();
          conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
          await conversation.save();
        }

        // Build the persisted message object to send back
        const persistedMsg = savedMessage.toJSON();

        // Notify the sender that message was persisted (with real _id)
        socket.emit('message:persisted', {
          conversationId,
          tempTimestamp: message.timestamp,
          message: persistedMsg,
        });

        // Forward to recipient with the persisted message
        io.to(`user:${recipientId}`).emit('message:receive', {
          conversationId,
          message: { ...persistedMsg, senderId: userId },
        });

        // If recipient is online, mark as delivered
        if (onlineUsers.has(recipientId)) {
          savedMessage.deliveryStatus = 'delivered';
          await savedMessage.save();
          socket.emit('message:delivered', { messageId: savedMessage._id.toString() });
        }
      } catch (err) {
        console.error('Failed to persist message:', err);
        // Fallback: still relay the message even if persistence fails
        io.to(`user:${recipientId}`).emit('message:receive', {
          conversationId,
          message: { ...message, senderId: userId },
        });
      }
    });

    socket.on('message:delivered', ({ messageId, senderId }) => {
      io.to(`user:${senderId}`).emit('message:delivered', { messageId });
    });

    socket.on('message:read', async ({ conversationId, senderId }) => {
      // Update all unread messages in this conversation to 'read'
      try {
        await Message.updateMany(
          { conversationId, senderId, deliveryStatus: { $ne: 'read' } },
          { deliveryStatus: 'read' }
        );
        // Reset unread count
        const conversation = await Conversation.findById(conversationId);
        if (conversation && conversation.unreadCounts) {
          conversation.unreadCounts.set(userId, 0);
          await conversation.save();
        }
      } catch (err) {
        console.error('Failed to update read status:', err);
      }
      io.to(`user:${senderId}`).emit('message:read', { conversationId, readBy: userId });
    });

    socket.on('typing:start', ({ conversationId, recipientId }) => {
      io.to(`user:${recipientId}`).emit('typing:start', { conversationId, userId });
    });

    socket.on('typing:stop', ({ conversationId, recipientId }) => {
      io.to(`user:${recipientId}`).emit('typing:stop', { conversationId, userId });
    });

    // --- Voice/Video Calls (with logging) ---
    socket.on('call:request', async ({ recipientId, callType, conversationId }) => {
      // Create a system message for call initiation
      try {
        const callMsg = await Message.create({
          conversationId,
          senderId: userId,
          recipientId,
          ciphertext: `__CALL_STARTED__`,
          nonce: `call_${callType}_${Date.now()}`,
          messageType: 'system',
          deliveryStatus: 'sent',
        });

        const systemMsg = {
          ...callMsg.toJSON(),
          callType,
          callAction: 'started',
          plaintext: `${callType === 'video' ? '📹 Video' : '📞 Voice'} call started`,
        };

        // Send call log to both users
        io.to(`user:${userId}`).emit('message:receive', {
          conversationId,
          message: systemMsg,
        });
        io.to(`user:${recipientId}`).emit('message:receive', {
          conversationId,
          message: systemMsg,
        });
      } catch (err) {
        console.error('Failed to create call log:', err);
      }

      io.to(`user:${recipientId}`).emit('call:request', {
        callerId: userId,
        callType,
        conversationId,
      });
    });

    socket.on('call:accept', async ({ callerId, conversationId }) => {
      io.to(`user:${callerId}`).emit('call:accept', { acceptedBy: userId });
    });

    socket.on('call:reject', async ({ callerId, reason, conversationId }) => {
      // Create a system message for call rejection
      if (conversationId) {
        try {
          const callMsg = await Message.create({
            conversationId,
            senderId: userId,
            recipientId: callerId,
            ciphertext: `__CALL_DECLINED__`,
            nonce: `call_declined_${Date.now()}`,
            messageType: 'system',
            deliveryStatus: 'sent',
          });

          const systemMsg = {
            ...callMsg.toJSON(),
            callAction: 'declined',
            plaintext: `📞 Call declined`,
          };

          io.to(`user:${userId}`).emit('message:receive', {
            conversationId,
            message: systemMsg,
          });
          io.to(`user:${callerId}`).emit('message:receive', {
            conversationId,
            message: systemMsg,
          });
        } catch (err) {
          console.error('Failed to create call decline log:', err);
        }
      }

      io.to(`user:${callerId}`).emit('call:reject', { rejectedBy: userId, reason });
    });

    socket.on('call:end', async ({ participantId, conversationId, duration }) => {
      // Create a system message for call end
      if (conversationId) {
        try {
          const durationText = duration
            ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`
            : '';

          const callMsg = await Message.create({
            conversationId,
            senderId: userId,
            recipientId: participantId,
            ciphertext: `__CALL_ENDED__`,
            nonce: `call_ended_${Date.now()}`,
            messageType: 'system',
            deliveryStatus: 'sent',
          });

          const systemMsg = {
            ...callMsg.toJSON(),
            callAction: 'ended',
            plaintext: `📞 Call ended${durationText}`,
          };

          io.to(`user:${userId}`).emit('message:receive', {
            conversationId,
            message: systemMsg,
          });
          io.to(`user:${participantId}`).emit('message:receive', {
            conversationId,
            message: systemMsg,
          });
        } catch (err) {
          console.error('Failed to create call end log:', err);
        }
      }

      io.to(`user:${participantId}`).emit('call:end', { endedBy: userId });
    });

    // --- WebRTC Signaling ---
    socket.on('webrtc:offer', ({ recipientId, offer }) => {
      io.to(`user:${recipientId}`).emit('webrtc:offer', { senderId: userId, offer });
    });

    socket.on('webrtc:answer', ({ recipientId, answer }) => {
      io.to(`user:${recipientId}`).emit('webrtc:answer', { senderId: userId, answer });
    });

    socket.on('webrtc:ice-candidate', ({ recipientId, candidate }) => {
      io.to(`user:${recipientId}`).emit('webrtc:ice-candidate', { senderId: userId, candidate });
    });

    // --- Meetings ---
    socket.on('meeting:join', ({ sessionId }) => {
      socket.join(`meeting:${sessionId}`);
      socket.to(`meeting:${sessionId}`).emit('meeting:participant-joined', { userId });
    });

    socket.on('meeting:leave', ({ sessionId }) => {
      socket.leave(`meeting:${sessionId}`);
      socket.to(`meeting:${sessionId}`).emit('meeting:participant-left', { userId });
    });

    socket.on('meeting:media-state', ({ sessionId, audio, video, screen }) => {
      socket.to(`meeting:${sessionId}`).emit('meeting:media-state', {
        userId, audio, video, screen,
      });
    });

    // --- Notes (Real-time collaboration) ---
    socket.on('note:update', ({ sessionId, content }) => {
      socket.to(`meeting:${sessionId}`).emit('note:update', { userId, content });
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('presence:offline', { userId });
        }
      }
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });

  return io;
};
