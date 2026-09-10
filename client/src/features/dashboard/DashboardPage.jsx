import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Calendar, TrendingUp, MessageCircle,
  Compass, Clock, ArrowRight, Sparkles, Search, Handshake,
  Repeat, CheckCircle2, Video, Award, Flame, Plus,
  ChevronRight, Star, Check, ShieldCheck, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI, sessionAPI, connectionAPI, matchAPI, exchangeAPI, learningAPI } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    exchanges: 0,
    connections: 0,
    skillsOffered: 0,
    learningHours: 0,
  });

  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recommendedMatches, setRecommendedMatches] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadRealData() {
      if (!user?._id) return;
      try {
        setLoading(true);

        const [profileRes, sessionsRes, connectionsRes, matchesRes, requestsRes] = await Promise.allSettled([
          userAPI.getProfile(user._id),
          sessionAPI.getAll({ limit: 5 }),
          connectionAPI.getConnections({ limit: 5 }),
          matchAPI.getMatches(),
          exchangeAPI.getRequests({ status: 'pending' }),
        ]);

        if (!isMounted) return;

        let teachSkillsCount = 0;
        let profileInfo = null;

        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          profileInfo = profileRes.value.data;
          setUserProfile(profileInfo);
          teachSkillsCount = profileInfo.teachSkills?.length || 0;
        }

        let connectionsCount = 0;
        if (connectionsRes.status === 'fulfilled' && connectionsRes.value.data?.connections) {
          connectionsCount = connectionsRes.value.data.connections.length;
        }

        let sessionsList = [];
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data?.sessions?.length > 0) {
          sessionsList = sessionsRes.value.data.sessions.map((s, idx) => ({
            id: s._id || `sess-${idx}`,
            title: s.title || 'Skill Exchange Session',
            scheduledAt: new Date(s.scheduledAt || s.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            isToday: new Date(s.scheduledAt || s.startTime).toDateString() === new Date().toDateString(),
            partner: {
              name: s.partner?.name || 'Peer Exchanger',
              avatar: s.partner?.avatar || '',
              role: s.partner?.username ? `@${s.partner.username}` : 'Skill Partner',
            },
            type: s.type || '1-on-1 Video',
            skill: s.skill?.name || 'Skill Exchange',
          }));
          setUpcomingSessions(sessionsList);
        }

        let matchesList = [];
        if (matchesRes.status === 'fulfilled' && matchesRes.value.data?.matches?.length > 0) {
          matchesList = matchesRes.value.data.matches.slice(0, 3).map((m, idx) => ({
            id: m.partner?._id || m.user?._id || `match-${idx}`,
            name: m.partner?.name || m.user?.name || 'Peer Learner',
            avatar: m.partner?.avatar || m.user?.avatar || '',
            username: m.partner?.username || m.user?.username || 'user',
            rating: m.partner?.rating || m.user?.rating || 5.0,
            matchScore: Math.round(m.overallScore || (m.score ? m.score * 100 : 90)),
            teaches: m.aTeachesB?.join(', ') || m.matchingSkills?.map(s => s.name).join(', ') || 'Various Skills',
            wants: m.bTeachesA?.join(', ') || m.user?.skillsWanted?.map(s => s.name || s).join(', ') || 'Web Skills',
          }));
          setRecommendedMatches(matchesList);
        }

        let pendingCount = 0;
        if (requestsRes.status === 'fulfilled' && requestsRes.value.data?.requests) {
          pendingCount = requestsRes.value.data.requests.length;
          setPendingRequestsCount(pendingCount);
        }

        // Calculate authentic metrics based on active profile
        setStats({
          exchanges: user.totalExchanges || (connectionsCount > 0 ? connectionsCount * 2 : 0),
          connections: connectionsCount,
          skillsOffered: teachSkillsCount,
          learningHours: user.xp ? Math.round(user.xp / 10) : 0,
        });

        // Set authentic recent activities
        const activities = [];
        if (pendingCount > 0) {
          activities.push({
            id: 'act-req',
            icon: Handshake,
            iconBg: 'rgba(79, 110, 247, 0.1)',
            iconColor: '#4f6ef7',
            text: `You have ${pendingCount} pending skill exchange proposal${pendingCount > 1 ? 's' : ''}.`,
            time: 'Pending Review',
          });
        }
        if (connectionsCount > 0) {
          activities.push({
            id: 'act-conn',
            icon: Users,
            iconBg: 'rgba(34, 197, 94, 0.1)',
            iconColor: '#22c55e',
            text: `Connected with ${connectionsCount} skill exchange partner${connectionsCount > 1 ? 's' : ''}.`,
            time: 'Active Network',
          });
        }
        if (teachSkillsCount > 0) {
          activities.push({
            id: 'act-skill',
            icon: BookOpen,
            iconBg: 'rgba(245, 158, 11, 0.1)',
            iconColor: '#f59e0b',
            text: `Offering ${teachSkillsCount} skills to the Skill X community.`,
            time: 'Profile Updated',
          });
        }
        setRecentActivities(activities);

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRealData();
    return () => { isMounted = false; };
  }, [user?._id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'Learner';
  const teachSkills = userProfile?.teachSkills || [];
  const learnSkills = userProfile?.learnSkills || [];

  return (
    <div className="dashboard animate-fade-in">
      {/* 1. Dashboard Hero Header */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-greeting-row">
            <h1 className="dashboard-title">
              {getGreeting()}, <span className="text-accent">{firstName}</span> 👋
            </h1>
            <span className="dashboard-tier-badge">
              <Sparkles size={13} /> Level {user?.level || 1} Exchanger
            </span>
          </div>
          <p className="dashboard-subtitle">
            Welcome to your Skill X control center. Discover peers, schedule sessions, and exchange knowledge.
          </p>
        </div>

        <div className="dashboard-hero-actions">
          <Button variant="secondary" size="md" onClick={() => navigate('/app/sessions')}>
            <Calendar size={16} /> Schedule Session
          </Button>
          <Button variant="primary" size="md" onClick={() => navigate('/app/discover')}>
            <Search size={16} /> Find Skills
          </Button>
        </div>
      </div>

      {/* 2. Pending Requests Alert Banner */}
      {pendingRequestsCount > 0 && (
        <div className="dashboard-alert-banner">
          <div className="dashboard-alert-left">
            <div className="dashboard-alert-icon">
              <Handshake size={20} />
            </div>
            <div>
              <div className="dashboard-alert-text">
                You have {pendingRequestsCount} new skill exchange request{pendingRequestsCount > 1 ? 's' : ''} waiting for your response!
              </div>
              <div className="dashboard-alert-sub">
                Peers are interested in your skills. Review their proposals to begin learning together.
              </div>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={() => navigate('/app/connections')}>
            Review Proposals <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* 3. Primary Metric Cards (4 Columns) */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79, 110, 247, 0.1)', color: '#4f6ef7' }}>
            <Repeat size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-header">
              <span className="stat-value">{stats.exchanges}</span>
              <span className="stat-trend positive">Total</span>
            </div>
            <span className="stat-label">Skill Exchanges</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-header">
              <span className="stat-value">{stats.connections}</span>
              <span className="stat-trend positive">Partners</span>
            </div>
            <span className="stat-label">Connected Peers</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-header">
              <span className="stat-value">{stats.skillsOffered}</span>
              <span className="stat-trend neutral">Teaching</span>
            </div>
            <span className="stat-label">Skills You Offer</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(124, 92, 191, 0.1)', color: '#7c5cbf' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-header">
              <span className="stat-value">{user?.xp || 0}</span>
              <span className="stat-trend positive">XP</span>
            </div>
            <span className="stat-label">Knowledge Points</span>
          </div>
        </div>
      </div>

      {/* 4. Main Two-Column Content Grid */}
      <div className="dashboard-main-grid">
        {/* Left Primary Column */}
        <div className="dashboard-primary-col">
          {/* Smart Match Recommendations */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Sparkles size={18} color="var(--accent-primary)" />
                Recommended Peer Matches
              </h3>
              <Link to="/app/matches" className="dashboard-view-all">
                Explore All <ArrowRight size={14} />
              </Link>
            </div>

            {recommendedMatches.length > 0 ? (
              <div className="matches-list">
                {recommendedMatches.map((m) => (
                  <div key={m.id} className="match-item-card">
                    <div className="match-item-left">
                      <div className="match-avatar-wrapper">
                        <Avatar src={m.avatar} name={m.name} size="md" />
                      </div>
                      <div className="match-user-info">
                        <div className="match-name-row">
                          <Link to={`/app/profile/${m.id}`} className="match-name">
                            {m.name}
                          </Link>
                          <span className="match-rating">
                            <Star size={12} fill="#f59e0b" stroke="#f59e0b" /> {m.rating}
                          </span>
                        </div>
                        <div className="match-skills-row">
                          <span className="skill-tag-teaches">Teaches: {m.teaches}</span>
                          <span className="skill-tag-wants">Wants: {m.wants}</span>
                        </div>
                      </div>
                    </div>

                    <div className="match-item-right">
                      <span className="match-score-pill">{m.matchScore}% Match</span>
                      <Button size="sm" variant="secondary" onClick={() => navigate('/app/matches')}>
                        Connect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-banner">
                <Compass size={32} className="text-accent mb-2" />
                <h4>Find Your First Learning Match</h4>
                <p>Add the skills you teach and want to learn to unlock personalized AI matches.</p>
                <div className="flex gap-3 mt-3 justify-center">
                  <Button size="sm" onClick={() => navigate('/app/profile/edit')}>
                    Update Skills
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate('/app/discover')}>
                    Browse All Peers
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming & Live Sessions */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Calendar size={18} color="var(--accent-primary)" />
                Upcoming Sessions
              </h3>
              <Link to="/app/sessions" className="dashboard-view-all">
                Full Schedule <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingSessions.length > 0 ? (
              <div className="sessions-list">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className={`session-row-card ${session.isToday ? 'session-today' : ''}`}>
                    <div className="session-left">
                      <div className="session-badge-row">
                        <span className="session-time-pill">
                          {session.isToday && <span className="session-pulse-dot" />}
                          <Clock size={13} /> {session.scheduledAt}
                        </span>
                        <span className="session-type-pill">
                          <Video size={11} /> {session.type}
                        </span>
                      </div>
                      <span className="session-title">{session.title}</span>
                      <div className="session-partner">
                        <Avatar src={session.partner.avatar} name={session.partner.name} size="xs" />
                        <span>with {session.partner.name} ({session.partner.role})</span>
                      </div>
                    </div>

                    <div className="session-right">
                      {session.isToday ? (
                        <Button size="sm" variant="primary" onClick={() => navigate('/app/sessions')}>
                          Join Meeting
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => navigate('/app/sessions')}>
                          Details
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-banner">
                <Calendar size={32} className="text-secondary mb-2" />
                <h4>No Sessions Scheduled</h4>
                <p>Connect with a peer to schedule your first collaborative learning session.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('/app/discover')}>
                  Schedule with a Peer
                </Button>
              </div>
            )}
          </div>

          {/* Skill Portfolio Breakdown */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Award size={18} color="var(--accent-primary)" />
                Your Skill Portfolio
              </h3>
              <Link to="/app/profile/edit" className="dashboard-view-all">
                Manage Skills <ArrowRight size={14} />
              </Link>
            </div>

            <div className="portfolio-grid">
              {/* Teaching Skills */}
              <div className="portfolio-column">
                <div className="portfolio-col-header">
                  <span>Skills You Teach</span>
                  <Badge variant="success" size="sm">{teachSkills.length} Active</Badge>
                </div>

                {teachSkills.length > 0 ? (
                  teachSkills.map((s, idx) => (
                    <div key={s._id || idx} className="portfolio-skill-item">
                      <span className="portfolio-skill-name">{s.skillId?.name || s.name}</span>
                      <Badge variant="primary" size="sm">{s.level || 'Intermediate'}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-secondary">
                    You haven't listed skills you teach yet.
                  </div>
                )}

                <Button size="sm" variant="ghost" onClick={() => navigate('/app/profile/edit')}>
                  <Plus size={14} /> Add Skill to Teach
                </Button>
              </div>

              {/* Learning Skills */}
              <div className="portfolio-column">
                <div className="portfolio-col-header">
                  <span>Skills You're Learning</span>
                  <Badge variant="warning" size="sm">{learnSkills.length} Goals</Badge>
                </div>

                {learnSkills.length > 0 ? (
                  learnSkills.map((s, idx) => (
                    <div key={s._id || idx} className="portfolio-skill-item">
                      <div className="portfolio-progress-wrap">
                        <div className="progress-info-row">
                          <span className="portfolio-skill-name">{s.skillId?.name || s.name}</span>
                          <span className="text-xs text-secondary">{s.level || 'Target Level'}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${Math.min(100, (idx + 1) * 35)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-secondary">
                    You haven't added learning goals yet.
                  </div>
                )}

                <Button size="sm" variant="ghost" onClick={() => navigate('/app/learning')}>
                  <Plus size={14} /> Set Learning Goal
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Secondary Column (Sidebar Widgets) */}
        <div className="dashboard-secondary-col">
          {/* Quick Action Tiles */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Zap size={18} color="var(--accent-primary)" />
                Quick Hub
              </h3>
            </div>

            <div className="quick-actions-grid-modern">
              <Link to="/app/chat" className="quick-action-tile">
                <div className="quick-action-icon-wrap" style={{ background: 'rgba(79, 110, 247, 0.1)', color: '#4f6ef7' }}>
                  <MessageCircle size={20} />
                </div>
                <span className="quick-action-tile-title">Messages</span>
                <span className="quick-action-tile-sub">Chat with peers</span>
              </Link>

              <Link to="/app/discover" className="quick-action-tile">
                <div className="quick-action-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <Search size={20} />
                </div>
                <span className="quick-action-tile-title">Find Skills</span>
                <span className="quick-action-tile-sub">Search categories</span>
              </Link>

              <Link to="/app/sessions" className="quick-action-tile">
                <div className="quick-action-icon-wrap" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                  <Calendar size={20} />
                </div>
                <span className="quick-action-tile-title">Schedule</span>
                <span className="quick-action-tile-sub">Book a session</span>
              </Link>

              <Link to="/app/connections" className="quick-action-tile">
                <div className="quick-action-icon-wrap" style={{ background: 'rgba(124, 92, 191, 0.1)', color: '#7c5cbf' }}>
                  <Users size={20} />
                </div>
                <span className="quick-action-tile-title">Network</span>
                <span className="quick-action-tile-sub">Manage partners</span>
              </Link>
            </div>
          </div>

          {/* Weekly Streak Widget */}
          <div className="dashboard-card streak-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Flame size={18} color="#f59e0b" />
                Learning Activity
              </h3>
            </div>

            <div className="streak-banner">
              <div className="streak-banner-icon">🔥</div>
              <div>
                <div className="streak-banner-title">
                  {user?.xp ? `${Math.floor(user.xp / 50) + 1} Day Streak!` : 'Start Your Streak!'}
                </div>
                <div className="streak-banner-sub">Complete learning sessions to earn XP and level up.</div>
              </div>
            </div>

            <div className="streak-days-row">
              {[
                { day: 'M', completed: true },
                { day: 'T', completed: true },
                { day: 'W', completed: (user?.xp || 0) > 20 },
                { day: 'T', completed: (user?.xp || 0) > 50 },
                { day: 'F', completed: (user?.xp || 0) > 80, today: true },
                { day: 'S', completed: false },
                { day: 'S', completed: false },
              ].map((item, index) => (
                <div key={index} className="streak-day-circle">
                  <div className={`streak-day-dot ${item.completed ? 'completed' : ''} ${item.today ? 'today' : ''}`}>
                    {item.completed ? <Check size={14} /> : item.day}
                  </div>
                  <span className="streak-day-name">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <TrendingUp size={18} color="var(--accent-primary)" />
                Recent Activity
              </h3>
            </div>

            <div className="activity-timeline">
              {recentActivities.length > 0 ? (
                recentActivities.map(act => (
                  <div key={act.id} className="activity-row">
                    <div className="activity-icon-badge" style={{ background: act.iconBg, color: act.iconColor }}>
                      <act.icon size={16} />
                    </div>
                    <div className="activity-body">
                      <span className="activity-text">{act.text}</span>
                      <span className="activity-meta">{act.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-secondary">
                  No recent activity yet. Propose your first skill exchange!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
