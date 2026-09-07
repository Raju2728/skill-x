const User = require('../models/User');
const UserSkill = require('../models/UserSkill');
const Availability = require('../models/Availability');
const Review = require('../models/Review');

/**
 * Intelligent weighted matching engine
 * Weights:
 * - Skill Complementarity: 40% (Mutual teach/learn overlap)
 * - Availability Overlap: 20% (Shared day/time slots)
 * - Experience Compatibility: 15% (Mentor/mentee or peer level)
 * - Language Commonality: 10% (Shared communication languages)
 * - Location / Proximity: 10% (Same timezone / region)
 * - Rating & Reputation: 5% (High ratings & community trust)
 */
class MatchingService {
  /**
   * Calculate compatibility between User A and User B
   */
  async calculateMatchScore(userAId, userBId) {
    const [userA, userB] = await Promise.all([
      User.findById(userAId),
      User.findById(userBId),
    ]);

    if (!userA || !userB) return null;

    const [skillsA, skillsB, availA, availB] = await Promise.all([
      UserSkill.find({ userId: userAId }).populate('skillId'),
      UserSkill.find({ userId: userBId }).populate('skillId'),
      Availability.find({ userId: userAId }),
      Availability.find({ userId: userBId }),
    ]);

    // 1. Skill Compatibility (Max 40 pts)
    // Does A teach what B wants to learn? Does B teach what A wants to learn?
    const aTeach = skillsA.filter(s => s.type === 'teach');
    const aLearn = skillsA.filter(s => s.type === 'learn');
    const bTeach = skillsB.filter(s => s.type === 'teach');
    const bLearn = skillsB.filter(s => s.type === 'learn');

    let aTeachesB = [];
    let bTeachesA = [];
    const reasons = [];

    // Find skills A teaches that B wants to learn
    for (const at of aTeach) {
      const match = bLearn.find(bl =>
        (bl.skillId?._id?.toString() === at.skillId?._id?.toString()) ||
        (bl.skillId?.name?.toLowerCase() === at.skillId?.name?.toLowerCase())
      );
      if (match) {
        aTeachesB.push(at.skillId?.name || 'Skill');
      }
    }

    // Find skills B teaches that A wants to learn
    for (const bt of bTeach) {
      const match = aLearn.find(al =>
        (al.skillId?._id?.toString() === bt.skillId?._id?.toString()) ||
        (al.skillId?.name?.toLowerCase() === bt.skillId?.name?.toLowerCase())
      );
      if (match) {
        bTeachesA.push(bt.skillId?.name || 'Skill');
      }
    }

    let skillScore = 0;
    if (aTeachesB.length > 0 && bTeachesA.length > 0) {
      // Direct two-way mutual exchange
      skillScore = 40;
      reasons.push(`Perfect mutual exchange: You teach ${aTeachesB.join(', ')} and learn ${bTeachesA.join(', ')}`);
    } else if (aTeachesB.length > 0) {
      skillScore = 24;
      reasons.push(`You can mentor them in ${aTeachesB.join(', ')}`);
    } else if (bTeachesA.length > 0) {
      skillScore = 24;
      reasons.push(`They can teach you ${bTeachesA.join(', ')}`);
    } else {
      // Fallback: check category overlaps
      skillScore = 5;
    }

    // 2. Availability Overlap (Max 20 pts)
    let availabilityScore = 0;
    let overlappingDays = 0;
    for (const slotA of availA) {
      const matchSlot = availB.find(slotB => slotB.dayOfWeek === slotA.dayOfWeek);
      if (matchSlot) {
        overlappingDays++;
      }
    }

    if (overlappingDays >= 3) {
      availabilityScore = 20;
      reasons.push(`High schedule synergy with ${overlappingDays} matching available days`);
    } else if (overlappingDays >= 1) {
      availabilityScore = 12;
      reasons.push(`Shared availability on ${overlappingDays} day(s) per week`);
    } else if (availA.length === 0 || availB.length === 0) {
      availabilityScore = 10; // Neutral if unconfigured
    } else {
      availabilityScore = 4;
    }

    // 3. Experience Compatibility (Max 15 pts)
    let experienceScore = 10;
    const expRank = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const diff = Math.abs((expRank[userA.experienceLevel] || 2) - (expRank[userB.experienceLevel] || 2));
    if (diff <= 1) {
      experienceScore = 15;
      reasons.push(`Compatible experience levels (${userA.experienceLevel || 'intermediate'} & ${userB.experienceLevel || 'intermediate'})`);
    } else {
      experienceScore = 8;
    }

    // 4. Language Commonality (Max 10 pts)
    let languageScore = 0;
    const sharedLangs = (userA.languages || ['English']).filter(l =>
      (userB.languages || ['English']).map(s => s.toLowerCase()).includes(l.toLowerCase())
    );
    if (sharedLangs.length >= 2) {
      languageScore = 10;
      reasons.push(`Fluent in multiple shared languages: ${sharedLangs.join(', ')}`);
    } else if (sharedLangs.length >= 1) {
      languageScore = 8;
      reasons.push(`Shared language: ${sharedLangs[0]}`);
    } else {
      languageScore = 2;
    }

    // 5. Location / Timezone (Max 10 pts)
    let locationScore = 6;
    if (userA.location && userB.location && userA.location.toLowerCase() === userB.location.toLowerCase()) {
      locationScore = 10;
      reasons.push(`Same local area: ${userA.location}`);
    }

    // 6. Rating & Trust (Max 5 pts)
    let ratingScore = 4; // default high community baseline
    if (userB.xp >= 300) ratingScore = 5;

    const overallScore = Math.min(100, Math.round(
      skillScore + availabilityScore + experienceScore + languageScore + locationScore + ratingScore
    ));

    return {
      partner: userB,
      overallScore,
      scores: {
        skillScore,
        availabilityScore,
        experienceScore,
        languageScore,
        locationScore,
        ratingScore,
      },
      aTeachesB,
      bTeachesA,
      reasons,
      isMutual: aTeachesB.length > 0 && bTeachesA.length > 0,
    };
  }

  /**
   * Find top recommended matches for a given user
   */
  async getTopMatchesForUser(userId, limit = 20) {
    const candidates = await User.find({
      _id: { $ne: userId },
      status: 'active',
      'privacySettings.allowDiscovery': { $ne: false },
    }).limit(50);

    const matches = [];
    for (const candidate of candidates) {
      const evaluation = await this.calculateMatchScore(userId, candidate._id);
      if (evaluation && evaluation.overallScore >= 40) {
        matches.push(evaluation);
      }
    }

    // Sort by overall score descending
    matches.sort((a, b) => b.overallScore - a.overallScore);
    return matches.slice(0, limit);
  }
}

module.exports = new MatchingService();
