import { X } from 'lucide-react';
import Badge from '../ui/Badge';
import './SkillTag.css';

const levelColors = {
  beginner: 'info',
  intermediate: 'primary',
  advanced: 'warning',
  expert: 'success',
};

export default function SkillTag({
  skill,
  level,
  type = 'teach',
  onRemove,
  clickable = false,
  onClick,
  className = '',
}) {
  const skillName = typeof skill === 'string' ? skill : (skill?.name || skill?.skillId?.name || 'Unknown Skill');
  const skillCategory = typeof skill === 'object' ? (skill?.category || skill?.skillId?.category) : null;
  const currentLevel = level || skill?.level || 'intermediate';

  return (
    <div
      className={`skill-tag skill-tag-${type} ${clickable ? 'skill-tag-clickable' : ''} ${className}`}
      onClick={clickable ? onClick : undefined}
    >
      <span className="skill-tag-name">{skillName}</span>
      {skillCategory && <span className="skill-tag-cat">{skillCategory}</span>}
      {currentLevel && (
        <Badge variant={levelColors[currentLevel] || 'default'} size="sm">
          {currentLevel}
        </Badge>
      )}
      {onRemove && (
        <button
          type="button"
          className="skill-tag-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${skillName}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
