const mongoose = require('mongoose');
const Skill = require('../models/Skill');

const initialSkills = [
  // Programming & Technology
  { name: 'JavaScript', category: 'Programming & Tech', description: 'Web development with modern JavaScript (ES6+)', popularity: 95 },
  { name: 'Python', category: 'Programming & Tech', description: 'General programming, scripting, data science, and AI', popularity: 98 },
  { name: 'Java', category: 'Programming & Tech', description: 'Object-oriented programming, Android, and enterprise apps with Java', popularity: 94 },
  { name: 'C', category: 'Programming & Tech', description: 'Low-level systems programming and embedded development in C', popularity: 88 },
  { name: 'C++', category: 'Programming & Tech', description: 'Systems, game development, and competitive programming with C++', popularity: 89 },
  { name: 'C#', category: 'Programming & Tech', description: '.NET development, Unity game scripting, and enterprise apps with C#', popularity: 87 },
  { name: 'React', category: 'Programming & Tech', description: 'Building interactive user interfaces with React', popularity: 92 },
  { name: 'Node.js', category: 'Programming & Tech', description: 'Server-side runtime with Express and async JS', popularity: 88 },
  { name: 'TypeScript', category: 'Programming & Tech', description: 'Typed JavaScript at any scale', popularity: 90 },
  { name: 'Kotlin', category: 'Programming & Tech', description: 'Modern Android and JVM development with Kotlin', popularity: 82 },
  { name: 'Swift', category: 'Programming & Tech', description: 'iOS and macOS app development with Swift', popularity: 83 },
  { name: 'PHP', category: 'Programming & Tech', description: 'Web backend development with PHP and Laravel', popularity: 78 },
  { name: 'Ruby', category: 'Programming & Tech', description: 'Web development with Ruby on Rails', popularity: 74 },
  { name: 'Flutter / Dart', category: 'Programming & Tech', description: 'Cross-platform mobile development with Flutter and Dart', popularity: 81 },
  { name: 'Rust', category: 'Programming & Tech', description: 'Fast, reliable, memory-efficient systems programming', popularity: 78 },
  { name: 'Go', category: 'Programming & Tech', description: 'Cloud infrastructure and microservices with Golang', popularity: 80 },
  { name: 'Machine Learning', category: 'Programming & Tech', description: 'Supervised/unsupervised learning, PyTorch, TensorFlow', popularity: 89 },
  { name: 'Docker & Kubernetes', category: 'Programming & Tech', description: 'Containerization and cluster orchestration', popularity: 82 },
  { name: 'SQL & Database Design', category: 'Programming & Tech', description: 'Relational databases, indexing, query optimization', popularity: 85 },
  { name: 'Cybersecurity', category: 'Programming & Tech', description: 'Network security, penetration testing, best practices', popularity: 81 },

  // Design & Creative
  { name: 'UI/UX Design', category: 'Design & Creative', description: 'Wireframing, user research, and interface design', popularity: 91 },
  { name: 'Figma', category: 'Design & Creative', description: 'Design systems, prototyping, and collaboration in Figma', popularity: 94 },
  { name: 'Graphic Design', category: 'Design & Creative', description: 'Visual branding, typography, poster and digital assets', popularity: 86 },
  { name: '3D Modeling (Blender)', category: 'Design & Creative', description: '3D asset creation, texturing, rendering, and sculpting', popularity: 84 },
  { name: 'Motion Graphics', category: 'Design & Creative', description: 'Animation and visual effects with After Effects', popularity: 76 },
  { name: 'Photography', category: 'Design & Creative', description: 'Composition, lighting, and Adobe Lightroom editing', popularity: 80 },
  { name: 'Video Editing', category: 'Design & Creative', description: 'Premiere Pro / DaVinci Resolve storytelling and pacing', popularity: 83 },

  // Languages
  { name: 'Spanish', category: 'Languages', description: 'Conversational and grammar Spanish from native/fluent speakers', popularity: 90 },
  { name: 'French', category: 'Languages', description: 'French pronunciation, idioms, and conversational mastery', popularity: 84 },
  { name: 'German', category: 'Languages', description: 'Grammar structures, technical and conversational German', popularity: 78 },
  { name: 'Japanese', category: 'Languages', description: 'Hiragana, Katakana, Kanji, and conversational Japanese', popularity: 89 },
  { name: 'Mandarin Chinese', category: 'Languages', description: 'Tones, pinyin, characters, and business Mandarin', popularity: 87 },
  { name: 'English (Advanced)', category: 'Languages', description: 'Business English, accent coaching, and writing mastery', popularity: 93 },
  { name: 'Italian', category: 'Languages', description: 'Conversational Italian, culture, and phonetics', popularity: 75 },
  { name: 'Korean', category: 'Languages', description: 'Hangul reading, grammar patterns, and daily dialogue', popularity: 85 },

  // Music & Audio
  { name: 'Acoustic Guitar', category: 'Music & Audio', description: 'Fingerpicking, chords, rhythm, and song accompaniment', popularity: 88 },
  { name: 'Piano & Keyboards', category: 'Music & Audio', description: 'Music theory, chord progressions, and classical/pop piano', popularity: 86 },
  { name: 'Music Production (Ableton/FL)', category: 'Music & Audio', description: 'Beatmaking, sound synthesis, mixing and mastering', popularity: 84 },
  { name: 'Vocal Training', category: 'Music & Audio', description: 'Breath control, pitch accuracy, resonance and range expansion', popularity: 80 },
  { name: 'Music Theory', category: 'Music & Audio', description: 'Scales, modes, harmony, ear training, and composition', popularity: 79 },

  // Business & Marketing
  { name: 'Digital Marketing & SEO', category: 'Business & Marketing', description: 'Organic growth, keyword strategy, and campaign analytics', popularity: 87 },
  { name: 'Product Management', category: 'Business & Marketing', description: 'Roadmapping, PRDs, prioritization frameworks, agile', popularity: 85 },
  { name: 'Public Speaking & Pitching', category: 'Business & Marketing', description: 'Presentation presence, storytelling, persuasive pitching', popularity: 82 },
  { name: 'Financial Modeling & Investing', category: 'Business & Marketing', description: 'DCF valuation, Excel modeling, portfolio concepts', popularity: 81 },
  { name: 'Content Writing & Copywriting', category: 'Business & Marketing', description: 'Persuasive sales copy, newsletters, and technical writing', popularity: 84 },

  // Academics & Sciences
  { name: 'Calculus & Linear Algebra', category: 'Academics & Sciences', description: 'Derivatives, integrals, matrix operations, vectors', popularity: 79 },
  { name: 'Statistics & Probability', category: 'Academics & Sciences', description: 'Hypothesis testing, Bayesian inference, distributions', popularity: 82 },
  { name: 'Physics Mechanics', category: 'Academics & Sciences', description: 'Kinematics, dynamics, energy, and orbital mechanics', popularity: 74 },

  // Lifestyle & Wellness
  { name: 'Chess Strategy', category: 'Lifestyle & Wellness', description: 'Opening repertoire, middle-game tactics, and endgame mastery', popularity: 83 },
  { name: 'Yoga & Mindfulness', category: 'Lifestyle & Wellness', description: 'Asanas, breathwork, posture alignment, guided meditation', popularity: 80 },
  { name: 'Artisan Bread Baking', category: 'Lifestyle & Wellness', description: 'Sourdough starter maintenance, fermentation, scoring', popularity: 77 },
];

async function seedSkills() {
  for (const item of initialSkills) {
    await Skill.findOneAndUpdate(
      { name: item.name },
      item,
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${initialSkills.length} skills successfully`);
}

module.exports = seedSkills;
