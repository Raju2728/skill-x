const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ciphertext: {
    type: String,
    required: true, // AES-GCM encrypted payload (base64)
  },
  nonce: {
    type: String, // Initialization vector / IV (base64)
    required: true,
  },
  keyVersion: {
    type: Number,
    default: 1,
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'voice', 'system'],
    default: 'text',
  },
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  fileMetadata: {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    fileUrl: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ recipientId: 1, deliveryStatus: 1 });

module.exports = mongoose.model('Message', messageSchema);
