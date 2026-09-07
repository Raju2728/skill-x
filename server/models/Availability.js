const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dayOfWeek: {
    type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    required: true,
    min: 0,
    max: 6,
  },
  startTime: {
    type: String, // 'HH:MM' (24-hour format e.g. '09:00')
    required: true,
  },
  endTime: {
    type: String, // 'HH:MM' (24-hour format e.g. '17:00')
    required: true,
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
}, { timestamps: true });

availabilitySchema.index({ userId: 1, dayOfWeek: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
