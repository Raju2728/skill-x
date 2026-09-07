const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  overallScore: {
    type: Number, // 0 - 100 percentage
    required: true,
    min: 0,
    max: 100,
  },
  scores: {
    skillScore: { type: Number, default: 0 }, // max 40
    availabilityScore: { type: Number, default: 0 }, // max 20
    experienceScore: { type: Number, default: 0 }, // max 15
    languageScore: { type: Number, default: 0 }, // max 10
    locationScore: { type: Number, default: 0 }, // max 10
    ratingScore: { type: Number, default: 0 }, // max 5
  },
  complementarySkills: [{
    userATeachesUserB: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    userBTeachesUserA: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  }],
  reasons: [{
    type: String,
  }],
  lastCalculated: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

matchSchema.index({ users: 1 });
matchSchema.index({ overallScore: -1 });

module.exports = mongoose.model('Match', matchSchema);
