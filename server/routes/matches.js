const express = require('express');
const { requireAuth } = require('../middleware/auth');
const matchingService = require('../services/matchingService');
const router = express.Router();

// Get top matches for current logged-in user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const matches = await matchingService.getTopMatchesForUser(req.user._id, 30);
    res.json({ matches });
  } catch (error) {
    next(error);
  }
});

// Get detailed match explanation for a specific user
router.get('/:userId/explain', requireAuth, async (req, res, next) => {
  try {
    const explanation = await matchingService.calculateMatchScore(req.user._id, req.params.userId);
    if (!explanation) {
      return res.status(404).json({ message: 'User not found or cannot calculate match' });
    }
    res.json({ explanation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
