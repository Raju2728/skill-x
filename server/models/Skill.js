const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  popularity: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

// Indexes (name already indexed via unique: true on field)
skillSchema.index({ category: 1 });

module.exports = mongoose.model('Skill', skillSchema);
