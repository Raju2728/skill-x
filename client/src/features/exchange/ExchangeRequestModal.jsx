import { useState, useEffect } from 'react';
import { Award, BookOpen, Send, Sparkles } from 'lucide-react';
import { exchangeAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import './ExchangeRequestModal.css';

export default function ExchangeRequestModal({
  isOpen,
  onClose,
  partner,
  onSuccess,
}) {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingSkills, setFetchingSkills] = useState(false);

  const [myTeachSkills, setMyTeachSkills] = useState([]);
  const [partnerTeachSkills, setPartnerTeachSkills] = useState([]);

  const [selectedSkillsOffered, setSelectedSkillsOffered] = useState([]);
  const [selectedSkillsRequested, setSelectedSkillsRequested] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadSkills() {
      if (!partner?._id || !currentUser?._id) return;
      try {
        setFetchingSkills(true);
        const [myRes, partnerRes] = await Promise.all([
          userAPI.getProfile(currentUser._id),
          userAPI.getProfile(partner._id),
        ]);

        const mine = myRes.data?.teachSkills || [];
        const theirs = partnerRes.data?.teachSkills || [];

        setMyTeachSkills(mine);
        setPartnerTeachSkills(theirs);

        // Pre-select first available by default
        if (mine.length > 0) setSelectedSkillsOffered([mine[0].skillId?._id || mine[0]._id]);
        if (theirs.length > 0) setSelectedSkillsRequested([theirs[0].skillId?._id || theirs[0]._id]);
      } catch (err) {
        console.error('Failed to load exchange skills:', err);
      } finally {
        setFetchingSkills(false);
      }
    }
    if (isOpen) {
      loadSkills();
    }
  }, [isOpen, partner?._id, currentUser?._id]);

  const toggleOffered = (id) => {
    if (selectedSkillsOffered.includes(id)) {
      if (selectedSkillsOffered.length > 1) {
        setSelectedSkillsOffered(selectedSkillsOffered.filter(s => s !== id));
      }
    } else {
      setSelectedSkillsOffered([...selectedSkillsOffered, id]);
    }
  };

  const toggleRequested = (id) => {
    if (selectedSkillsRequested.includes(id)) {
      if (selectedSkillsRequested.length > 1) {
        setSelectedSkillsRequested(selectedSkillsRequested.filter(s => s !== id));
      }
    } else {
      setSelectedSkillsRequested([...selectedSkillsRequested, id]);
    }
  };

  const handleSendProposal = async () => {
    if (selectedSkillsOffered.length === 0 || selectedSkillsRequested.length === 0) {
      toast.warning('Select skills', 'Please select at least 1 skill to offer and 1 to learn.');
      return;
    }

    setLoading(true);
    try {
      await exchangeAPI.sendRequest({
        receiverId: partner._id,
        skillsOffered: selectedSkillsOffered,
        skillsRequested: selectedSkillsRequested,
        message: message.trim() || undefined,
      });

      toast.success('Proposal sent!', `Exchange proposal sent to ${partner.name}.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send', err.response?.data?.message || 'Could not send proposal.');
    } finally {
      setLoading(false);
    }
  };

  if (!partner) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose Skill Exchange"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Send} onClick={handleSendProposal} loading={loading}>
            Send Proposal
          </Button>
        </>
      }
    >
      <div className="exchange-modal-content">
        {/* Partner Header */}
        <div className="exchange-partner-header">
          <Avatar src={partner.avatar} name={partner.name} size="lg" />
          <div>
            <h4>Exchange proposal with {partner.name}</h4>
            <span className="text-xs text-secondary">@{partner.username} • {partner.location || 'Global'}</span>
          </div>
        </div>

        {/* Skills Offered (What you will teach) */}
        <div className="exchange-skills-box">
          <div className="exchange-box-title">
            <Award size={16} className="text-accent" />
            <span>Skills you will teach (Offer)</span>
          </div>
          {myTeachSkills.length === 0 ? (
            <p className="text-xs text-tertiary">You have no teaching skills on your profile.</p>
          ) : (
            <div className="exchange-chips-grid">
              {myTeachSkills.map(s => {
                const sId = s.skillId?._id || s._id;
                const isSelected = selectedSkillsOffered.includes(sId);
                return (
                  <button
                    key={sId}
                    type="button"
                    className={`exchange-chip ${isSelected ? 'exchange-chip-active' : ''}`}
                    onClick={() => toggleOffered(sId)}
                  >
                    <span>{s.skillId?.name || s.name}</span>
                    <span className="exchange-chip-lvl">{s.level || 'Intermediate'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Skills Requested (What partner will teach) */}
        <div className="exchange-skills-box">
          <div className="exchange-box-title">
            <BookOpen size={16} className="text-accent-secondary" />
            <span>Skills you want {partner.name.split(' ')[0]} to teach (Request)</span>
          </div>
          {partnerTeachSkills.length === 0 ? (
            <p className="text-xs text-tertiary">{partner.name} has not listed teaching skills yet.</p>
          ) : (
            <div className="exchange-chips-grid">
              {partnerTeachSkills.map(s => {
                const sId = s.skillId?._id || s._id;
                const isSelected = selectedSkillsRequested.includes(sId);
                return (
                  <button
                    key={sId}
                    type="button"
                    className={`exchange-chip ${isSelected ? 'exchange-chip-active-secondary' : ''}`}
                    onClick={() => toggleRequested(sId)}
                  >
                    <span>{s.skillId?.name || s.name}</span>
                    <span className="exchange-chip-lvl">{s.level || 'Intermediate'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Intro Message */}
        <div className="input-group">
          <label className="input-label">Intro Message (Optional)</label>
          <textarea
            className="setup-textarea"
            rows={3}
            placeholder="Hi! I saw your profile and would love to exchange Figma design coaching for React fundamentals..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
