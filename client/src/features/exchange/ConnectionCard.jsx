import { Link, useNavigate } from 'react-router-dom';
import {
  MessageCircle, Calendar, Phone, Video, MoreHorizontal,
  Clock, Award, BookOpen, Star, Sparkles
} from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown';
import './ConnectionCard.css';

export default function ConnectionCard({ connection, onStatusChange }) {
  const navigate = useNavigate();
  const { partner, sessionCount = 0, totalHoursExchanged = 0, exchangeRequest } = connection;

  const teachSkills = partner?.teachSkills || [];
  const learnSkills = partner?.learnSkills || [];

  const handleStartCall = (type) => {
    navigate(`/app/chat`, {
      state: {
        partnerId: partner?._id,
        autoCall: type, // 'voice' | 'video'
      },
    });
  };

  const handleSchedule = () => {
    navigate('/app/sessions', {
      state: {
        openScheduler: true,
        selectedPartner: partner,
      },
    });
  };

  return (
    <Card variant="surface" padding="none" className="connection-card animate-fade-in">
      <div className="conn-card-header">
        <div className="conn-partner-meta">
          <Avatar
            src={partner?.avatar}
            name={partner?.name}
            size="lg"
            online={partner?.privacySettings?.showOnlineStatus ? true : undefined}
          />
          <div className="conn-name-col">
            <Link to={`/app/profile/${partner?._id}`} className="conn-name">
              {partner?.name}
            </Link>
            <span className="text-xs text-secondary">@{partner?.username}</span>
            <div className="conn-stats-chips">
              <span className="conn-stat-badge">
                <Calendar size={11} /> {sessionCount} sessions
              </span>
              <span className="conn-stat-badge">
                <Clock size={11} /> {totalHoursExchanged}h exchanged
              </span>
            </div>
          </div>
        </div>

        <Dropdown
          trigger={
            <button className="conn-menu-trigger" aria-label="Connection options">
              <MoreHorizontal size={18} />
            </button>
          }
          align="right"
        >
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  close();
                  onStatusChange?.(connection._id, connection.status === 'active' ? 'paused' : 'active');
                }}
              >
                {connection.status === 'active' ? 'Pause Partnership' : 'Resume Partnership'}
              </DropdownItem>
              <DropdownItem
                danger
                onClick={() => {
                  close();
                  onStatusChange?.(connection._id, 'archived');
                }}
              >
                Archive Connection
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>

      <div className="conn-card-body">
        {/* Skills exchange preview */}
        <div className="conn-skills-row">
          <div className="conn-skill-col">
            <span className="conn-skill-label">
              <Award size={12} className="text-accent" /> You Learn:
            </span>
            <div className="conn-skills-tags">
              {teachSkills.slice(0, 2).map(s => (
                <span key={s._id || s.skillId?._id} className="conn-chip-learn">
                  {s.skillId?.name || s.name}
                </span>
              ))}
            </div>
          </div>

          <div className="conn-skill-col">
            <span className="conn-skill-label">
              <BookOpen size={12} className="text-accent-secondary" /> You Teach:
            </span>
            <div className="conn-skills-tags">
              {learnSkills.slice(0, 2).map(s => (
                <span key={s._id || s.skillId?._id} className="conn-chip-teach">
                  {s.skillId?.name || s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Action Bar */}
      <div className="conn-card-footer">
        <Button
          size="sm"
          icon={MessageCircle}
          onClick={() => navigate('/app/chat', { state: { partnerId: partner?._id } })}
          className="flex-1"
        >
          Chat
        </Button>

        <Button
          variant="secondary"
          size="sm"
          icon={Calendar}
          onClick={handleSchedule}
          title="Schedule Session"
        />

        <Button
          variant="secondary"
          size="sm"
          icon={Phone}
          onClick={() => handleStartCall('voice')}
          title="Voice Call"
        />

        <Button
          variant="secondary"
          size="sm"
          icon={Video}
          onClick={() => handleStartCall('video')}
          title="Video Meeting"
        />
      </div>
    </Card>
  );
}
