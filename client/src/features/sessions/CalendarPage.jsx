import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon, Clock, Video, Mic, Plus,
  ChevronLeft, ChevronRight, Users, CheckCircle2, Sparkles
} from 'lucide-react';
import { sessionAPI } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import SessionSchedulerModal from './SessionSchedulerModal';
import { PageLoader } from '../../components/ui/Spinner';
import './CalendarPage.css';

export default function CalendarPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Scheduler modal
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerPartner, setSchedulerPartner] = useState(null);

  useEffect(() => {
    if (location.state?.openScheduler) {
      setSchedulerPartner(location.state.selectedPartner || null);
      setShowScheduler(true);
    }
  }, [location.state]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data } = await sessionAPI.getAll();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar grid dates
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];
  // Empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ empty: true, key: `empty-${i}` });
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(year, month, d);
    const daySessions = sessions.filter(s => {
      const sDate = new Date(s.startTime);
      return sDate.getFullYear() === year && sDate.getMonth() === month && sDate.getDate() === d;
    });
    calendarCells.push({ day: d, date: dayDate, sessions: daySessions, key: `day-${d}` });
  }

  const upcomingSessions = sessions.filter(s =>
    new Date(s.startTime) >= new Date() && s.status !== 'cancelled'
  );

  return (
    <div className="calendar-page animate-fade-in">
      <div className="calendar-header-row">
        <div>
          <h1 className="calendar-title">Sessions & Calendar</h1>
          <p className="calendar-subtitle">
            Manage your peer learning sessions, video meeting rooms, and collaborative notes.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowScheduler(true)}>
          Schedule Session
        </Button>
      </div>

      <div className="calendar-layout-grid">
        {/* Main Calendar View */}
        <div className="calendar-main-col">
          <Card variant="surface" padding="none" className="calendar-card">
            {/* Month Nav Header */}
            <div className="calendar-month-bar">
              <h3 className="calendar-month-label">
                {monthNames[month]} {year}
              </h3>
              <div className="flex gap-2">
                <button className="cal-nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
                  <ChevronLeft size={18} />
                </button>
                <button className="cal-nav-btn" onClick={handleNextMonth} aria-label="Next month">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="calendar-weekdays-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="cal-weekday">{d}</div>
              ))}
            </div>

            {/* Month Grid Cells */}
            <div className="calendar-cells-grid">
              {calendarCells.map(cell => {
                if (cell.empty) return <div key={cell.key} className="cal-cell cal-cell-empty" />;

                const isToday = cell.date.toDateString() === new Date().toDateString();
                const hasSessions = cell.sessions.length > 0;

                return (
                  <div key={cell.key} className={`cal-cell ${isToday ? 'cal-cell-today' : ''}`}>
                    <span className="cal-day-number">{cell.day}</span>
                    <div className="cal-cell-events">
                      {cell.sessions.map(s => (
                        <button
                          key={s._id}
                          type="button"
                          className="cal-event-pill"
                          onClick={() => navigate(`/app/sessions/${s._id}`)}
                          title={s.title}
                        >
                          {s.meetingMode === 'video' ? <Video size={10} /> : <Mic size={10} />}
                          <span className="truncate">{s.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar: Upcoming Sessions List */}
        <div className="calendar-sidebar-col">
          <Card variant="surface" padding="md">
            <h3 className="calendar-upcoming-title">
              <Clock size={18} className="text-accent" />
              Upcoming Sessions ({upcomingSessions.length})
            </h3>

            {loading ? (
              <PageLoader />
            ) : upcomingSessions.length === 0 ? (
              <div className="cal-empty-upcoming">
                <CalendarIcon size={32} className="text-tertiary mb-2" />
                <p>No upcoming sessions scheduled.</p>
                <Button variant="secondary" size="sm" onClick={() => setShowScheduler(true)} className="mt-3">
                  Schedule Now
                </Button>
              </div>
            ) : (
              <div className="cal-upcoming-list">
                {upcomingSessions.map(session => {
                  const startTime = new Date(session.startTime);
                  const isStartingSoon = (startTime - new Date()) < (30 * 60 * 1000); // within 30m

                  return (
                    <div key={session._id} className="cal-upcoming-card animate-fade-in">
                      <div className="cal-card-top">
                        <Badge variant={session.meetingMode === 'video' ? 'primary' : 'warning'} size="sm">
                          {session.meetingMode === 'video' ? <Video size={11} /> : <Mic size={11} />}
                          {session.meetingMode.toUpperCase()}
                        </Badge>
                        <span className="cal-card-time">
                          {startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="cal-card-session-title">{session.title}</h4>

                      <div className="cal-card-participants">
                        <Users size={12} className="text-tertiary" />
                        <span>{session.participants.map(p => p.name).join(' & ')}</span>
                      </div>

                      <div className="cal-card-actions">
                        <Link to={`/app/sessions/${session._id}`} className="flex-1">
                          <Button variant="secondary" size="sm" fullWidth>Details & Notes</Button>
                        </Link>
                        <Button
                          size="sm"
                          icon={Video}
                          onClick={() => navigate(`/app/meetings/${session.meetingRoomId}`, { state: { session } })}
                        >
                          Join Room
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Scheduler Modal */}
      {showScheduler && (
        <SessionSchedulerModal
          isOpen={showScheduler}
          onClose={() => {
            setShowScheduler(false);
            setSchedulerPartner(null);
          }}
          partner={schedulerPartner}
          onSessionCreated={loadSessions}
        />
      )}
    </div>
  );
}
