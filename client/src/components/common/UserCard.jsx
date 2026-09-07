import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Award, BookOpen, Sparkles, MessageCircle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import SkillTag from './SkillTag';
import './UserCard.css';

export default function UserCard({ user, onConnect }) {
  const navigate = useNavigate();
  const teachSkills = user.teachSkills || [];
  const learnSkills = user.learnSkills || [];

  return (
    <Card variant="surface" padding="none" className="user-card animate-fade-in">
      <div className="user-card-header">
        <Avatar
          src={user.avatar}
          name={user.name}
          size="lg"
          online={user.privacySettings?.showOnlineStatus ? true : undefined}
        />
        <div className="user-card-title-group">
          <Link to={`/app/profile/${user._id}`} className="user-card-name">
            {user.name}
          </Link>
          <span className="user-card-username">@{user.username}</span>
          <div className="user-card-meta">
            {user.location && (
              <span className="user-card-location">
                <MapPin size={12} /> {user.location}
              </span>
            )}
            <span className="user-card-level">
              Lvl {user.level || 1}
            </span>
          </div>
        </div>
      </div>

      <div className="user-card-body">
        {user.bio ? (
          <p className="user-card-bio line-clamp-2">{user.bio}</p>
        ) : (
          <p className="user-card-bio-empty">No bio provided</p>
        )}

        {/* Teaching skills */}
        <div className="user-card-skills-section">
          <span className="user-card-skills-label">
            <Award size={13} className="text-accent" /> Teaches:
          </span>
          <div className="user-card-skills-tags">
            {teachSkills.length > 0 ? (
              teachSkills.slice(0, 3).map(s => (
                <SkillTag key={s._id || s.skillId?._id} skill={s.skillId || s} level={s.level} type="teach" />
              ))
            ) : (
              <span className="text-xs text-tertiary">None listed</span>
            )}
            {teachSkills.length > 3 && (
              <span className="user-card-more-badge">+{teachSkills.length - 3}</span>
            )}
          </div>
        </div>

        {/* Learning skills */}
        <div className="user-card-skills-section">
          <span className="user-card-skills-label">
            <BookOpen size={13} className="text-accent-secondary" /> Learns:
          </span>
          <div className="user-card-skills-tags">
            {learnSkills.length > 0 ? (
              learnSkills.slice(0, 3).map(s => (
                <SkillTag key={s._id || s.skillId?._id} skill={s.skillId || s} level={s.level} type="learn" />
              ))
            ) : (
              <span className="text-xs text-tertiary">None listed</span>
            )}
            {learnSkills.length > 3 && (
              <span className="user-card-more-badge">+{learnSkills.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      <div className="user-card-footer">
        <Link to={`/app/profile/${user._id}`} className="flex-1">
          <Button variant="secondary" size="sm" fullWidth>View Profile</Button>
        </Link>
        <Button
          size="sm"
          icon={Sparkles}
          onClick={() => onConnect ? onConnect(user) : navigate(`/app/connections`, { state: { requestPartner: user } })}
        >
          Exchange
        </Button>
      </div>
    </Card>
  );
}
