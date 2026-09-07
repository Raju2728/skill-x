const mongoose = require('mongoose');

const keyBundleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  identityKey: {
    type: String, // Public identity key (JWK or base64)
    required: true,
  },
  signedPreKey: {
    key: { type: String, required: true },
    signature: { type: String, required: true },
    keyId: { type: Number, default: 1 },
  },
  oneTimePreKeys: [{
    keyId: Number,
    key: String,
  }],
}, { timestamps: true });

// userId already indexed via unique: true on field

module.exports = mongoose.model('KeyBundle', keyBundleSchema);
