const mongoose = require('mongoose');

const exchangeRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skillsOffered: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
  }],
  skillsRequested: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
  }],
  message: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending',
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  respondedAt: {
    type: Date,
  },
}, { timestamps: true });

exchangeRequestSchema.index({ sender: 1, receiver: 1 });
exchangeRequestSchema.index({ receiver: 1, status: 1 });
exchangeRequestSchema.index({ sender: 1, status: 1 });

module.exports = mongoose.model('ExchangeRequest', exchangeRequestSchema);
