import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Globe, Star, Calendar, MessageSquare, ArrowRight,
  Edit3, Shield, Award, BookOpen, Clock, UserCheck, Sparkles, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import SkillTag from '../../components/common/SkillTag';
import { PageLoader } from '../../components/ui/Spinner';
import './ProfilePage.css';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const profileUserId = id || currentUser?._id;
  const isOwnProfile = !id || id === currentUser?._id;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      if (!profileUserId) return;
      try {
        setLoading(true);
        const { data } = await userAPI.getProfile(profileUserId);
        setProfileData(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [profileUserId]);

  if (loading) return <PageLoader />;
  if (error || !profileData?.user) {
    return (
      <div className="profile-error">
        <h3>User not found</h3>
        <p>The profile you are looking for does not exist or is private.</p>
        <Link to="/app/discover"><Button>Explore Community</Button></Link>
      </div>
    );
  }

  const { user, teachSkills = [], learnSkills = [], availability = [], ratingStats } = profileData;

  const handleStartExchange = () => {
    navigate('/app/connections', { state: { requestPartner: user } });
  };

  return (
    <div className="profile-page animate-fade-in">
      {/* Profile Header Banner */}
      <div className="profile-banner">
        <div className="profile-banner-glow" />
        <div className="profile-header-content">
          <div className="profile-avatar-row">
            <Avatar
              src={user.avatar}
              name={user.name}
              size="2xl"
              online={user.privacySettings?.showOnlineStatus ? true : undefined}
            />

            <div className="profile-title-block">
              <div className="profile-name-row">
                <h1 className="profile-name">{user.name}</h1>
                {user.role === 'admin' && (
                  <Badge variant="primary" size="md">
                    <Shield size={12} /> Admin
                  </Badge>
                )}
                <Badge variant="warning" size="md">
                  Level {user.level || 1} • {user.xp || 0} XP
                </Badge>
              </div>
              <p className="profile-username">@{user.username}</p>

              <div className="profile-meta-row">
                {user.location && (
                  <span className="profile-meta-item">
                    <MapPin size={14} /> {user.location}
                  </span>
                )}
                {user.languages?.length > 0 && (
                  <span className="profile-meta-item">
                    <Globe size={14} /> {user.languages.join(', ')}
                  </span>
                )}
                <span className="profile-meta-item">
                  <Star size={14} className="text-warning fill-warning" />
                  <strong>{ratingStats?.average || 5.0}</strong> ({ratingStats?.count || 0} reviews)
                </span>
              </div>
            </div>

            <div className="profile-actions-block">
              {isOwnProfile ? (
                <Link to="/app/profile/edit">
                  <Button variant="secondary" icon={Edit3}>Edit Profile</Button>
                </Link>
              ) : (
                <div className="profile-cta-group">
                  <Button icon={Sparkles} onClick={handleStartExchange}>
                    Request Exchange
                  </Button>
                  <Button
                    variant="secondary"
                    icon={MessageSquare}
                    onClick={() => navigate('/app/chat', { state: { partnerId: user._id } })}
                  >
                    Chat
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="profile-grid">
        {/* Left Column: Bio & Skills */}
        <div className="profile-left-col">
          {/* Bio */}
          <Card variant="surface" padding="md">
            <h3 className="profile-card-title">About</h3>
            <p className="profile-bio-text">
              {user.bio || 'No bio provided yet.'}
            </p>
          </Card>

          {/* Skills to Teach */}
          <Card variant="surface" padding="md">
            <div className="profile-section-header">
              <h3 className="profile-card-title">
                <Award size={18} className="text-accent" />
                Skills to Teach
              </h3>
              <span className="text-xs text-secondary">{teachSkills.length} skills</span>
            </div>
            {teachSkills.length === 0 ? (
              <p className="text-xs text-tertiary">No teaching skills listed.</p>
            ) : (
              <div className="profile-skills-tags">
                {teachSkills.map(s => (
                  <SkillTag
                    key={s._id}
                    skill={s.skillId}
                    level={s.level}
                    type="teach"
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Skills to Learn */}
          <Card variant="surface" padding="md">
            <div className="profile-section-header">
              <h3 className="profile-card-title">
                <BookOpen size={18} className="text-accent-secondary" />
                Skills to Learn
              </h3>
              <span className="text-xs text-secondary">{learnSkills.length} skills</span>
            </div>
            {learnSkills.length === 0 ? (
              <p className="text-xs text-tertiary">No learning goals listed.</p>
            ) : (
              <div className="profile-skills-tags">
                {learnSkills.map(s => (
                  <SkillTag
                    key={s._id}
                    skill={s.skillId}
                    level={s.level}
                    type="learn"
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Availability & Stats */}
        <div className="profile-right-col">
          {/* Weekly Schedule */}
          <Card variant="surface" padding="md">
            <div className="profile-section-header">
              <h3 className="profile-card-title">
                <Calendar size={18} className="text-accent" />
                Weekly Availability
              </h3>
              <span className="text-xs text-secondary">
                {availability[0]?.timezone || 'UTC'}
              </span>
            </div>

            {availability.length === 0 ? (
              <p className="text-xs text-tertiary">No set availability slots. Direct message to coordinate.</p>
            ) : (
              <div className="profile-availability-list">
                {daysOfWeek.map((dayName, dayIndex) => {
                  const slotsForDay = availability.filter(s => s.dayOfWeek === dayIndex);
                  if (slotsForDay.length === 0) return null;
                  return (
                    <div key={dayName} className="profile-avail-day-row">
                      <span className="profile-avail-day-name">{dayName}</span>
                      <div className="profile-avail-badges">
                        {slotsForDay.map((slot, sIdx) => (
                          <span key={sIdx} className="profile-slot-chip">
                            <Clock size={12} /> {slot.startTime} - {slot.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Activity & Trust Card */}
          <Card variant="surface" padding="md">
            <h3 className="profile-card-title">
              <CheckCircle2 size={18} className="text-success" />
              Community Standing
            </h3>
            <div className="profile-stats-list">
              <div className="profile-stat-row">
                <span className="text-secondary">Experience Level</span>
                <strong className="text-capitalize">{user.experienceLevel || 'Intermediate'}</strong>
              </div>
              <div className="profile-stat-row">
                <span className="text-secondary">Member Since</span>
                <strong>{new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</strong>
              </div>
              <div className="profile-stat-row">
                <span className="text-secondary">Email Verified</span>
                <span className="text-success font-medium">Verified</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
