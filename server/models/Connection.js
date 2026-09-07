const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  exchangeRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExchangeRequest',
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
  },
  sessionCount: {
    type: Number,
    default: 0,
  },
  totalHoursExchanged: {
    type: Number,
    default: 0,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

connectionSchema.index({ users: 1 });
connectionSchema.index({ status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
