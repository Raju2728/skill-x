const mongoose = require('mongoose');

const learningGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  targetLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate',
  },
  progressPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  milestones: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'paused'],
    default: 'in-progress',
  },
  targetDate: Date,
}, { timestamps: true });

learningGoalSchema.index({ userId: 1 });

module.exports = mongoose.model('LearningGoal', learningGoalSchema);
