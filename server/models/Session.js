const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    default: 60,
  },
  meetingMode: {
    type: String,
    enum: ['video', 'audio', 'chat'],
    default: 'video',
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  topicDescription: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  meetingRoomId: {
    type: String,
    unique: true,
    required: true,
  },
}, { timestamps: true });

sessionSchema.index({ participants: 1, startTime: 1 });
sessionSchema.index({ status: 1 });
// meetingRoomId already indexed via unique: true on field

module.exports = mongoose.model('Session', sessionSchema);
