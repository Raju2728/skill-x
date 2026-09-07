const express = require('express');
const { requireAuth } = require('../middleware/auth');
const KeyBundle = require('../models/KeyBundle');
const router = express.Router();

// Upload user's public key bundle (Identity Key, Signed Prekey, One-Time Prekeys)
router.post('/bundle', requireAuth, async (req, res, next) => {
  try {
    const { identityKey, signedPreKey, oneTimePreKeys = [] } = req.body;

    if (!identityKey || !signedPreKey) {
      return res.status(400).json({ message: 'Identity key and signed pre-key are required' });
    }

    const bundle = await KeyBundle.findOneAndUpdate(
      { userId: req.user._id },
      {
        identityKey,
        signedPreKey,
        oneTimePreKeys,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Key bundle registered', bundleId: bundle._id });
  } catch (error) {
    next(error);
  }
});

// Fetch a partner's public key bundle to initiate X3DH handshake
router.get('/bundle/:userId', requireAuth, async (req, res, next) => {
  try {
    const bundle = await KeyBundle.findOne({ userId: req.params.userId });

    if (!bundle) {
      return res.status(404).json({ message: 'Key bundle not found for user' });
    }

    // Pop one one-time prekey if available
    let oneTimePreKey = null;
    if (bundle.oneTimePreKeys && bundle.oneTimePreKeys.length > 0) {
      oneTimePreKey = bundle.oneTimePreKeys.shift();
      await bundle.save();
    }

    res.json({
      bundle: {
        userId: bundle.userId,
        identityKey: bundle.identityKey,
        signedPreKey: bundle.signedPreKey,
        oneTimePreKey,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Replenish one-time pre-keys
router.post('/prekeys', requireAuth, async (req, res, next) => {
  try {
    const { preKeys = [] } = req.body;

    await KeyBundle.findOneAndUpdate(
      { userId: req.user._id },
      { $push: { oneTimePreKeys: { $each: preKeys } } }
    );

    res.json({ message: 'Pre-keys replenished successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
