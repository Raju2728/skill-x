import { useState } from 'react';
import { Calendar, Clock, Video, Mic, MessageSquare, BookOpen } from 'lucide-react';
import { sessionAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './SessionSchedulerModal.css';

export default function SessionSchedulerModal({
  isOpen,
  onClose,
  partner,
  onSessionCreated,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [title, setTitle] = useState(`Skill Exchange with ${partner?.name || 'Partner'}`);
  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [meetingMode, setMeetingMode] = useState('video');
  const [topicDescription, setTopicDescription] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim() || !date || !time) {
      toast.warning('Incomplete form', 'Please fill in all required fields.');
      return;
    }

    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    setLoading(true);
    try {
      await sessionAPI.create({
        title,
        participantId: partner._id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        durationMinutes,
        meetingMode,
        topicDescription,
      });

      toast.success('Session scheduled!', 'The learning session has been added to your calendar.');
      onSessionCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Schedule failed', err.response?.data?.message || 'Could not schedule session.');
    } finally {
      setLoading(false);
    }
  };

  if (!partner) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Learning Session"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Calendar} onClick={handleSubmit} loading={loading}>
            Confirm & Schedule
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="scheduler-form">
        <Input
          label="Session Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. React Fundamentals & Figma Review"
          required
        />

        <div className="scheduler-datetime-row">
          <div className="input-group flex-1">
            <label className="input-label">Date</label>
            <input
              type="date"
              className="scheduler-input"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Start Time</label>
            <input
              type="time"
              className="scheduler-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Duration</label>
            <select
              className="scheduler-select"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        {/* Meeting Mode Selection */}
        <div className="input-group">
          <label className="input-label">Meeting Format</label>
          <div className="meeting-mode-options">
            <button
              type="button"
              className={`mode-option-btn ${meetingMode === 'video' ? 'mode-option-active' : ''}`}
              onClick={() => setMeetingMode('video')}
            >
              <Video size={18} />
              <span>HD Video Meeting</span>
            </button>
            <button
              type="button"
              className={`mode-option-btn ${meetingMode === 'audio' ? 'mode-option-active' : ''}`}
              onClick={() => setMeetingMode('audio')}
            >
              <Mic size={18} />
              <span>Voice Call Only</span>
            </button>
          </div>
        </div>

        {/* Agenda / Topics */}
        <div className="input-group">
          <label className="input-label">Session Agenda & Topics (Optional)</label>
          <textarea
            className="setup-textarea"
            rows={3}
            placeholder="Topics to cover, links to study material, goals for this session..."
            value={topicDescription}
            onChange={(e) => setTopicDescription(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
