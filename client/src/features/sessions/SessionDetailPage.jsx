import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Clock, Video, Mic, Users, CheckCircle2, ArrowLeft,
  FileText, Upload, Download, Sparkles, AlertCircle, XCircle
} from 'lucide-react';
import { sessionAPI, fileAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import './SessionDetailPage.css';

export default function SessionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const [sessionRes, filesRes] = await Promise.all([
          sessionAPI.getById(id),
          fileAPI.getFile ? fileAPI.upload : Promise.resolve({ data: { files: [] } }),
        ]);

        setSession(sessionRes.data?.session);
        setNoteContent(sessionRes.data?.note?.content || '');
      } catch (err) {
        console.error('Failed to load session details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [id]);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await sessionAPI.update(id, { content: noteContent });
      toast.success('Notes saved', 'Shared session notes updated.');
    } catch (err) {
      toast.error('Save failed', 'Could not update session notes.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCompleteSession = async () => {
    try {
      await sessionAPI.update(`${id}/complete`, {});
      toast.success('Session Completed! 🎉', '+100 XP awarded for learning exchange.');
      navigate('/app/reviews', { state: { sessionId: session._id, session } });
    } catch (err) {
      toast.error('Error', err.response?.data?.message || 'Could not complete session');
    }
  };

  const handleCancelSession = async () => {
    try {
      await sessionAPI.cancel(id);
      toast.info('Session cancelled', 'The scheduled session was cancelled.');
      setShowCancelModal(false);
      navigate('/app/sessions');
    } catch (err) {
      toast.error('Error', err.response?.data?.message || 'Could not cancel session');
    }
  };

  if (loading) return <PageLoader />;
  if (!session) {
    return (
      <div className="session-not-found">
        <h3>Session not found</h3>
        <Link to="/app/sessions"><Button>Back to Calendar</Button></Link>
      </div>
    );
  }

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const isCompleted = session.status === 'completed';
  const isCancelled = session.status === 'cancelled';

  return (
    <div className="session-detail-page animate-fade-in">
      {/* Header Bar */}
      <div className="session-detail-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/app/sessions')}>
            Calendar
          </Button>
          <h1 className="session-detail-title">{session.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {!isCompleted && !isCancelled && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={CheckCircle2}
                onClick={handleCompleteSession}
              >
                Mark Completed
              </Button>
              <Button
                icon={Video}
                onClick={() => navigate(`/app/meetings/${session.meetingRoomId}`, { state: { session } })}
              >
                Join Meeting Room
              </Button>
            </>
          )}
          {isCompleted && (
            <Badge variant="success" size="lg">
              <CheckCircle2 size={14} /> Completed
            </Badge>
          )}
        </div>
      </div>

      {/* Main Grid: Details + Collaborative Notes */}
      <div className="session-detail-grid">
        {/* Left Column: Metadata & Participants */}
        <div className="session-detail-left">
          <Card variant="surface" padding="md">
            <h3 className="session-section-title">Session Information</h3>

            <div className="session-info-rows">
              <div className="session-info-item">
                <span className="session-info-label"><Calendar size={14} /> Date</span>
                <strong>{startTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              </div>

              <div className="session-info-item">
                <span className="session-info-label"><Clock size={14} /> Time</span>
                <strong>
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({session.durationMinutes} mins)
                </strong>
              </div>

              <div className="session-info-item">
                <span className="session-info-label"><Video size={14} /> Format</span>
                <strong className="text-capitalize">{session.meetingMode} Meeting</strong>
              </div>
            </div>

            {session.topicDescription && (
              <div className="session-agenda-box">
                <span className="session-info-label">Topics & Agenda</span>
                <p>{session.topicDescription}</p>
              </div>
            )}
          </Card>

          {/* Participants */}
          <Card variant="surface" padding="md">
            <h3 className="session-section-title">
              <Users size={16} className="text-accent" />
              Participants
            </h3>
            <div className="session-participants-list">
              {session.participants.map(p => (
                <div key={p._id} className="session-p-row">
                  <Avatar src={p.avatar} name={p.name} size="md" />
                  <div>
                    <span className="session-p-name">{p.name}</span>
                    <span className="session-p-username">@{p.username}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Shared Notes Pad */}
        <div className="session-detail-right">
          <Card variant="surface" padding="md" className="session-notes-card">
            <div className="session-notes-header">
              <div>
                <h3 className="session-section-title">
                  <FileText size={16} className="text-accent" />
                  Collaborative Session Notes
                </h3>
                <p className="text-xs text-secondary">
                  Shared real-time workspace for action items, summaries, and shared code/links.
                </p>
              </div>
              <Button size="sm" onClick={handleSaveNote} loading={savingNote}>
                Save Notes
              </Button>
            </div>

            <textarea
              className="session-notes-textarea"
              rows={16}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="# Session Notes..."
            />
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSession}
        title="Cancel Session"
        message="Are you sure you want to cancel this scheduled session? Both participants will be notified."
        confirmText="Yes, Cancel Session"
      />
    </div>
  );
}
