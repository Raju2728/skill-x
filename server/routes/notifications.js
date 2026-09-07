const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  res.json({ notifications: [] });
});

router.put('/:id/read', requireAuth, async (req, res) => {
  res.json({ message: 'Marked as read' });
});

router.put('/read-all', requireAuth, async (req, res) => {
  res.json({ message: 'All marked as read' });
});

module.exports = router;
