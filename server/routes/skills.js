const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const { escapeRegex } = require('../utils/sanitize');
const router = express.Router();

// Get all skills
router.get('/', async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const filter = { status: 'active' };
    if (search) filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
    if (category) filter.category = category;
    const skills = await Skill.find(filter).sort('name');
    res.json({ skills });
  } catch (error) { next(error); }
});

// Get categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Skill.distinct('category');
    res.json({ categories: categories.sort() });
  } catch (error) { next(error); }
});

// Add user skill
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { skillId, type, level } = req.body;
    const userSkill = await UserSkill.create({ userId: req.user._id, skillId, type, level });
    await userSkill.populate('skillId');
    res.status(201).json({ userSkill });
  } catch (error) { next(error); }
});

// Remove user skill
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await UserSkill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Skill removed' });
  } catch (error) { next(error); }
});

module.exports = router;
