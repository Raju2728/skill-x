const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const UserSkill = require('../models/UserSkill');
const Skill = require('../models/Skill');
const Availability = require('../models/Availability');
const Review = require('../models/Review');
const { escapeRegex } = require('../utils/sanitize');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed for profile photo'));
    }
    cb(null, true);
  },
});

// Get user public profile with skills, ratings, and availability
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch skills
    const userSkills = await UserSkill.find({ userId: user._id }).populate('skillId');
    const teachSkills = userSkills.filter(s => s.type === 'teach');
    const learnSkills = userSkills.filter(s => s.type === 'learn');

    // Fetch availability
    const availability = await Availability.find({ userId: user._id }).sort('dayOfWeek');

    // Fetch reviews & rating aggregate
    let ratingStats = { average: 5.0, count: 0 };
    try {
      if (Review) {
        const reviews = await Review.find({ reviewee: user._id });
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((acc, r) => acc + (r.overall || 5), 0);
          ratingStats = {
            average: parseFloat((totalRating / reviews.length).toFixed(1)),
            count: reviews.length,
          };
        }
      }
    } catch {
      // ignore review errors if model is stubbed
    }

    const isOwnProfile = req.user && req.user._id.toString() === user._id.toString();

    // Respect privacy settings if not own profile
    const responseUser = user.toJSON();
    if (!isOwnProfile) {
      if (!user.privacySettings?.showEmail) delete responseUser.email;
      if (!user.privacySettings?.showLocation) delete responseUser.location;
    }

    res.json({
      user: responseUser,
      teachSkills,
      learnSkills,
      availability,
      ratingStats,
      isOwnProfile,
    });
  } catch (error) {
    next(error);
  }
});

// Update current user's profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'bio', 'location', 'languages', 'experienceLevel',
      'privacySettings', 'profileCompleted', 'avatar',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Upload and set user avatar
router.post('/avatar', requireAuth, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Avatar upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    try {
      const avatarUrl = `/uploads/${req.file.filename}`;
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatarUrl } },
        { new: true, runValidators: true }
      );
      res.json({
        message: 'Profile photo updated successfully',
        avatarUrl,
        user,
      });
    } catch (dbErr) {
      next(dbErr);
    }
  });
});

// Get user skills
router.get('/:id/skills', async (req, res, next) => {
  try {
    const skills = await UserSkill.find({ userId: req.params.id }).populate('skillId');
    res.json({
      teachSkills: skills.filter(s => s.type === 'teach'),
      learnSkills: skills.filter(s => s.type === 'learn'),
    });
  } catch (error) {
    next(error);
  }
});

// Add skill to current user
router.post('/skills', requireAuth, async (req, res, next) => {
  try {
    const { skillId, skillName, category, type, level } = req.body;
    let targetSkillId = skillId;

    // If custom skill name is passed, find or create
    if (!targetSkillId && skillName) {
      const safeSkillName = escapeRegex(skillName.trim());
      let skill = await Skill.findOne({ name: { $regex: new RegExp(`^${safeSkillName}$`, 'i') } });
      if (!skill) {
        skill = await Skill.create({
          name: skillName.trim(),
          category: category || 'General',
          popularity: 1,
        });
      } else {
        skill.popularity += 1;
        await skill.save();
      }
      targetSkillId = skill._id;
    }

    if (!targetSkillId) {
      return res.status(400).json({ message: 'Skill is required' });
    }

    // Upsert user skill
    const userSkill = await UserSkill.findOneAndUpdate(
      { userId: req.user._id, skillId: targetSkillId, type },
      { level: level || 'beginner' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('skillId');

    // Add XP for adding skills
    req.user.xp = (req.user.xp || 0) + 15;
    req.user.calculateLevel();
    await req.user.save();

    res.status(201).json({ userSkill });
  } catch (error) {
    next(error);
  }
});

// Delete user skill
router.delete('/skills/:id', requireAuth, async (req, res, next) => {
  try {
    await UserSkill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Skill removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Bulk update skills during onboarding/edit
router.put('/skills/sync', requireAuth, async (req, res, next) => {
  try {
    const { teachSkills = [], learnSkills = [] } = req.body;

    // Remove existing
    await UserSkill.deleteMany({ userId: req.user._id });

    const newSkills = [];

    // Helper to resolve skill IDs
    const resolveAndCreate = async (list, type) => {
      for (const item of list) {
        let sid = item.skillId || item._id;
        if (!sid && item.name) {
          const safeItemName = escapeRegex(item.name.trim());
          let found = await Skill.findOne({ name: { $regex: new RegExp(`^${safeItemName}$`, 'i') } });
          if (!found) {
            found = await Skill.create({
              name: item.name.trim(),
              category: item.category || 'General',
            });
          }
          sid = found._id;
        }
        if (sid) {
          newSkills.push({
            userId: req.user._id,
            skillId: sid,
            type,
            level: item.level || 'intermediate',
          });
        }
      }
    };

    await resolveAndCreate(teachSkills, 'teach');
    await resolveAndCreate(learnSkills, 'learn');

    if (newSkills.length > 0) {
      await UserSkill.insertMany(newSkills);
    }

    const populated = await UserSkill.find({ userId: req.user._id }).populate('skillId');
    res.json({
      teachSkills: populated.filter(s => s.type === 'teach'),
      learnSkills: populated.filter(s => s.type === 'learn'),
    });
  } catch (error) {
    next(error);
  }
});

// Get user availability
router.get('/:id/availability', async (req, res, next) => {
  try {
    const availability = await Availability.find({ userId: req.params.id }).sort('dayOfWeek');
    res.json({ availability });
  } catch (error) {
    next(error);
  }
});

// Set / sync availability schedule
router.put('/availability/sync', requireAuth, async (req, res, next) => {
  try {
    const { slots = [], timezone = 'UTC' } = req.body;
    await Availability.deleteMany({ userId: req.user._id });

    if (slots.length > 0) {
      const docs = slots.map(s => ({
        userId: req.user._id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone,
      }));
      await Availability.insertMany(docs);
    }

    const updated = await Availability.find({ userId: req.user._id }).sort('dayOfWeek');
    res.json({ availability: updated });
  } catch (error) {
    next(error);
  }
});

// Discover users with rich filtering
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      skill,
      category,
      experience,
      language,
      sort = 'recommended',
    } = req.query;

    const query = {
      status: 'active',
      'privacySettings.allowDiscovery': { $ne: false },
    };

    // Exclude self if logged in
    if (req.user) {
      query._id = { $ne: req.user._id };
    }

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
        { bio: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (experience) {
      query.experienceLevel = experience;
    }

    if (language) {
      const safeLanguage = escapeRegex(language.trim());
      query.languages = { $in: [new RegExp(safeLanguage, 'i')] };
    }

    let users = await User.find(query)
      .sort(sort === 'newest' ? '-createdAt' : '-xp')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Populate skills for each user
    const userIds = users.map(u => u._id);
    const allUserSkills = await UserSkill.find({ userId: { $in: userIds } }).populate('skillId');

    let enrichedUsers = users.map(u => {
      const uSkills = allUserSkills.filter(s => s.userId.toString() === u._id.toString());
      return {
        ...u.toJSON(),
        teachSkills: uSkills.filter(s => s.type === 'teach'),
        learnSkills: uSkills.filter(s => s.type === 'learn'),
      };
    });

    // Filter by skill or category if requested
    if (skill) {
      enrichedUsers = enrichedUsers.filter(u =>
        u.teachSkills.some(s => s.skillId?.name?.toLowerCase().includes(skill.toLowerCase())) ||
        u.learnSkills.some(s => s.skillId?.name?.toLowerCase().includes(skill.toLowerCase()))
      );
    }

    if (category) {
      enrichedUsers = enrichedUsers.filter(u =>
        u.teachSkills.some(s => s.skillId?.category?.toLowerCase() === category.toLowerCase()) ||
        u.learnSkills.some(s => s.skillId?.category?.toLowerCase() === category.toLowerCase())
      );
    }

    const total = await User.countDocuments(query);

    res.json({
      users: enrichedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
