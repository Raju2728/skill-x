import { useState, useEffect } from 'react';
import { Search, Plus, Check, Sparkles } from 'lucide-react';
import { skillAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SkillTag from '../../components/common/SkillTag';
import './SkillPicker.css';

const levels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

// Fallback catalog shown when the server DB has no seeded skills yet
const FALLBACK_SKILLS = [
  // Programming & Tech
  { _id: 'f-java', name: 'Java', category: 'Programming & Tech', description: 'Object-oriented programming with Java' },
  { _id: 'f-c', name: 'C', category: 'Programming & Tech', description: 'Low-level systems programming in C' },
  { _id: 'f-cpp', name: 'C++', category: 'Programming & Tech', description: 'Systems and competitive programming with C++' },
  { _id: 'f-python', name: 'Python', category: 'Programming & Tech', description: 'General programming, scripting, data science, and AI' },
  { _id: 'f-js', name: 'JavaScript', category: 'Programming & Tech', description: 'Web development with modern JavaScript (ES6+)' },
  { _id: 'f-ts', name: 'TypeScript', category: 'Programming & Tech', description: 'Typed JavaScript at any scale' },
  { _id: 'f-react', name: 'React', category: 'Programming & Tech', description: 'Building interactive UIs with React' },
  { _id: 'f-nodejs', name: 'Node.js', category: 'Programming & Tech', description: 'Server-side runtime with Express' },
  { _id: 'f-csharp', name: 'C#', category: 'Programming & Tech', description: '.NET development and game scripting with C#' },
  { _id: 'f-kotlin', name: 'Kotlin', category: 'Programming & Tech', description: 'Modern Android and JVM development' },
  { _id: 'f-swift', name: 'Swift', category: 'Programming & Tech', description: 'iOS and macOS app development' },
  { _id: 'f-rust', name: 'Rust', category: 'Programming & Tech', description: 'Fast, memory-safe systems programming' },
  { _id: 'f-go', name: 'Go', category: 'Programming & Tech', description: 'Cloud infrastructure and microservices with Go' },
  { _id: 'f-php', name: 'PHP', category: 'Programming & Tech', description: 'Web backend development with PHP' },
  { _id: 'f-ruby', name: 'Ruby', category: 'Programming & Tech', description: 'Web development with Ruby on Rails' },
  { _id: 'f-sql', name: 'SQL & Databases', category: 'Programming & Tech', description: 'Relational databases, indexing, query optimization' },
  { _id: 'f-ml', name: 'Machine Learning', category: 'Programming & Tech', description: 'Supervised/unsupervised learning, PyTorch, TensorFlow' },
  { _id: 'f-docker', name: 'Docker & Kubernetes', category: 'Programming & Tech', description: 'Containerization and cluster orchestration' },
  { _id: 'f-cyber', name: 'Cybersecurity', category: 'Programming & Tech', description: 'Network security, penetration testing, best practices' },
  { _id: 'f-flutter', name: 'Flutter / Dart', category: 'Programming & Tech', description: 'Cross-platform mobile development' },
  // Design & Creative
  { _id: 'f-figma', name: 'Figma', category: 'Design & Creative', description: 'Design systems, prototyping, and collaboration in Figma' },
  { _id: 'f-ux', name: 'UI/UX Design', category: 'Design & Creative', description: 'Wireframing, user research, and interface design' },
  { _id: 'f-gfx', name: 'Graphic Design', category: 'Design & Creative', description: 'Visual branding, typography, and digital assets' },
  { _id: 'f-blender', name: '3D Modeling (Blender)', category: 'Design & Creative', description: '3D asset creation, texturing, and rendering' },
  { _id: 'f-photo', name: 'Photography', category: 'Design & Creative', description: 'Composition, lighting, and Lightroom editing' },
  { _id: 'f-video', name: 'Video Editing', category: 'Design & Creative', description: 'Premiere Pro / DaVinci Resolve editing' },
  { _id: 'f-motion', name: 'Motion Graphics', category: 'Design & Creative', description: 'Animation and visual effects with After Effects' },
  // Languages
  { _id: 'f-tamil', name: 'Tamil', category: 'Languages', description: 'Conversational Tamil, reading, grammar, and literature' },
  { _id: 'f-spanish', name: 'Spanish', category: 'Languages', description: 'Conversational and grammar Spanish' },
  { _id: 'f-french', name: 'French', category: 'Languages', description: 'French pronunciation, idioms, and conversation' },
  { _id: 'f-german', name: 'German', category: 'Languages', description: 'Grammar structures, technical and conversational German' },
  { _id: 'f-japanese', name: 'Japanese', category: 'Languages', description: 'Hiragana, Katakana, Kanji, and conversation' },
  { _id: 'f-mandarin', name: 'Mandarin Chinese', category: 'Languages', description: 'Tones, pinyin, characters, and business Mandarin' },
  { _id: 'f-english', name: 'English (Advanced)', category: 'Languages', description: 'Business English, accent coaching, and writing' },
  { _id: 'f-korean', name: 'Korean', category: 'Languages', description: 'Hangul reading, grammar patterns, and daily dialogue' },
  { _id: 'f-arabic', name: 'Arabic', category: 'Languages', description: 'Modern Standard Arabic and conversational dialects' },
  { _id: 'f-hindi', name: 'Hindi', category: 'Languages', description: 'Hindi speaking, reading, and writing' },
  // Music & Audio
  { _id: 'f-guitar', name: 'Acoustic Guitar', category: 'Music & Audio', description: 'Fingerpicking, chords, and rhythm' },
  { _id: 'f-piano', name: 'Piano & Keyboards', category: 'Music & Audio', description: 'Music theory, chord progressions, classical/pop piano' },
  { _id: 'f-prod', name: 'Music Production', category: 'Music & Audio', description: 'Beatmaking, sound synthesis, mixing and mastering' },
  { _id: 'f-theory', name: 'Music Theory', category: 'Music & Audio', description: 'Scales, harmony, ear training, and composition' },
  // Business & Marketing
  { _id: 'f-mktg', name: 'Digital Marketing & SEO', category: 'Business & Marketing', description: 'Organic growth, keyword strategy, campaign analytics' },
  { _id: 'f-pm', name: 'Product Management', category: 'Business & Marketing', description: 'Roadmapping, PRDs, prioritization, agile' },
  { _id: 'f-speak', name: 'Public Speaking & Pitching', category: 'Business & Marketing', description: 'Storytelling, presentation presence, pitching' },
  { _id: 'f-finance', name: 'Financial Modeling', category: 'Business & Marketing', description: 'Excel modeling, valuation, portfolio concepts' },
  { _id: 'f-write', name: 'Content Writing', category: 'Business & Marketing', description: 'Sales copy, newsletters, and technical writing' },
  // Lifestyle & Wellness
  { _id: 'f-chess', name: 'Chess Strategy', category: 'Lifestyle & Wellness', description: 'Opening repertoire, tactics, and endgame mastery' },
  { _id: 'f-yoga', name: 'Yoga & Mindfulness', category: 'Lifestyle & Wellness', description: 'Asanas, breathwork, and guided meditation' },
];

const FALLBACK_CATEGORIES = [
  'All',
  'Programming & Tech',
  'Design & Creative',
  'Languages',
  'Music & Audio',
  'Business & Marketing',
  'Lifestyle & Wellness',
];

export default function SkillPicker({
  selectedSkills = [],
  onChange,
  type = 'teach',
  title = 'Select Skills',
  maxSkills = 10,
}) {
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSkillToAdd, setActiveSkillToAdd] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('intermediate');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [skillsRes, catsRes] = await Promise.all([
          skillAPI.getAll(),
          skillAPI.getCategories(),
        ]);
        const fetchedSkills = skillsRes.data?.skills || [];
        const fetchedCats = catsRes.data?.categories || [];
        // Use fallback catalog if the DB hasn't been seeded yet
        if (fetchedSkills.length === 0) {
          setSkills(FALLBACK_SKILLS);
          setCategories(FALLBACK_CATEGORIES);
        } else {
          setSkills(fetchedSkills);
          setCategories(['All', ...fetchedCats]);
        }
      } catch (err) {
        console.error('Failed to load skills, using fallback:', err);
        setSkills(FALLBACK_SKILLS);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || skill.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const isSelected = (skill) => {
    return selectedSkills.some(s =>
      (s.skillId?._id === skill._id) || (s._id === skill._id) || (s.name === skill.name)
    );
  };

  const handleSelectSkill = (skill) => {
    if (isSelected(skill)) {
      handleRemoveSkill(skill);
      return;
    }
    setActiveSkillToAdd(skill);
  };

  const confirmAddSkill = () => {
    if (!activeSkillToAdd) return;
    if (selectedSkills.length >= maxSkills) return;

    const newSkill = {
      skillId: activeSkillToAdd,
      _id: activeSkillToAdd._id,
      name: activeSkillToAdd.name,
      category: activeSkillToAdd.category,
      level: selectedLevel,
      type,
    };

    onChange([...selectedSkills, newSkill]);
    setActiveSkillToAdd(null);
    setSelectedLevel('intermediate');
  };

  const handleCreateCustomSkill = () => {
    if (!search.trim()) return;
    const customSkill = {
      name: search.trim(),
      category: selectedCategory === 'All' ? 'Custom' : selectedCategory,
      level: selectedLevel,
      type,
    };
    onChange([...selectedSkills, customSkill]);
    setSearch('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    const next = selectedSkills.filter(s => {
      const sId = s.skillId?._id || s._id || s.name;
      const rId = skillToRemove.skillId?._id || skillToRemove._id || skillToRemove.name;
      return sId !== rId;
    });
    onChange(next);
  };

  return (
    <div className="skill-picker">
      <div className="skill-picker-header">
        <div>
          <h3 className="skill-picker-title">{title}</h3>
          <p className="skill-picker-subtitle">
            {selectedSkills.length} of {maxSkills} skills selected
          </p>
        </div>
      </div>

      {/* Selected tags */}
      <div className="skill-picker-selected">
        {selectedSkills.length === 0 ? (
          <div className="skill-picker-empty-selected">
            No skills added yet. Search or click below to add.
          </div>
        ) : (
          <div className="skill-picker-tags-grid">
            {selectedSkills.map((s, idx) => (
              <SkillTag
                key={s._id || s.name || idx}
                skill={s}
                level={s.level}
                type={type}
                onRemove={() => handleRemoveSkill(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Level selector modal popover */}
      {activeSkillToAdd && (
        <div className="skill-level-prompt animate-scale-in">
          <div className="skill-level-header">
            <Sparkles size={16} className="text-accent" />
            <span>Select proficiency for <strong>{activeSkillToAdd.name}</strong></span>
          </div>
          <div className="skill-level-options">
            {levels.map(lvl => (
              <button
                key={lvl.value}
                type="button"
                className={`skill-level-btn ${selectedLevel === lvl.value ? 'skill-level-active' : ''}`}
                onClick={() => setSelectedLevel(lvl.value)}
              >
                {lvl.label}
              </button>
            ))}
          </div>
          <div className="skill-level-actions">
            <Button variant="ghost" size="sm" onClick={() => setActiveSkillToAdd(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmAddSkill}>
              Add Skill
            </Button>
          </div>
        </div>
      )}

      {/* Search & Category filter */}
      <div className="skill-picker-search-bar">
        <Input
          icon={Search}
          placeholder="Search skills (e.g. React, Spanish, Piano)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="skill-picker-categories">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            className={`skill-cat-pill ${selectedCategory === cat ? 'skill-cat-pill-active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skills catalog grid */}
      <div className="skill-picker-catalog">
        {loading ? (
          <div className="skill-picker-loading">Loading skills catalog...</div>
        ) : filteredSkills.length > 0 ? (
          filteredSkills.map(skill => {
            const active = isSelected(skill);
            return (
              <button
                key={skill._id}
                type="button"
                className={`skill-catalog-item ${active ? 'skill-catalog-item-selected' : ''}`}
                onClick={() => handleSelectSkill(skill)}
              >
                <div className="skill-catalog-info">
                  <span className="skill-catalog-name">{skill.name}</span>
                  <span className="skill-catalog-category">{skill.category}</span>
                </div>
                <div className="skill-catalog-action">
                  {active ? <Check size={16} className="text-success" /> : <Plus size={16} />}
                </div>
              </button>
            );
          })
        ) : (
          <div className="skill-picker-no-results">
            <p>No predefined skill found matching "{search}"</p>
            {search.trim() && (
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={handleCreateCustomSkill}
                className="mt-2"
              >
                Add "{search.trim()}" as custom skill
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
