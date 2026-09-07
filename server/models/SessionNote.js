const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    unique: true,
  },
  content: {
    type: String, // Real-time collaborative markdown / rich notes
    default: '',
  },
  lastEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// sessionId already indexed via unique: true on field

module.exports = mongoose.model('SessionNote', sessionNoteSchema);
