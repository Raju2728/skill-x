import { Award, Calendar, CheckCircle2, Globe, MapPin, Star, Sparkles } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import './MatchExplanation.css';

export default function MatchExplanation({ isOpen, onClose, explanation }) {
  if (!explanation) return null;

  const { partner, overallScore = 0, scores = {}, reasons = [], aTeachesB = [], bTeachesA = [] } = explanation;

  const scoreBars = [
    { label: 'Skill Complementarity', score: scores.skillScore || 0, max: 40, icon: Award, color: 'var(--accent-primary)' },
    { label: 'Schedule & Availability', score: scores.availabilityScore || 0, max: 20, icon: Calendar, color: 'var(--success)' },
    { label: 'Experience Match', score: scores.experienceScore || 0, max: 15, icon: CheckCircle2, color: 'var(--warning)' },
    { label: 'Language Alignment', score: scores.languageScore || 0, max: 10, icon: Globe, color: 'var(--accent-secondary)' },
    { label: 'Location / Region', score: scores.locationScore || 0, max: 10, icon: MapPin, color: 'var(--info)' },
    { label: 'Community Trust', score: scores.ratingScore || 0, max: 5, icon: Star, color: '#eab308' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Match Compatibility Breakdown"
      size="md"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="match-explain-content">
        {/* Partner Header */}
        <div className="match-explain-partner-row">
          <Avatar src={partner?.avatar} name={partner?.name} size="lg" />
          <div className="match-explain-partner-info">
            <h4>{partner?.name}</h4>
            <span className="text-xs text-secondary">@{partner?.username}</span>
          </div>
          <div className="match-explain-score-badge">
            <span className="match-explain-score-val">{overallScore}%</span>
            <span className="match-explain-score-lbl">Compatibility</span>
          </div>
        </div>

        {/* Mutual Exchange Breakdown */}
        {(aTeachesB.length > 0 || bTeachesA.length > 0) && (
          <div className="match-exchange-summary">
            {aTeachesB.length > 0 && (
              <div className="exchange-col">
                <span className="exchange-col-lbl">You teach:</span>
                <strong>{aTeachesB.join(', ')}</strong>
              </div>
            )}
            {bTeachesA.length > 0 && (
              <div className="exchange-col">
                <span className="exchange-col-lbl">They teach:</span>
                <strong>{bTeachesA.join(', ')}</strong>
              </div>
            )}
          </div>
        )}

        {/* Score Progress Bars */}
        <div className="match-score-bars">
          <h5 className="match-subsection-title">Algorithm Weighted Factors</h5>
          {scoreBars.map(bar => {
            const pct = Math.round((bar.score / bar.max) * 100);
            return (
              <div key={bar.label} className="match-bar-row">
                <div className="match-bar-label-group">
                  <span className="match-bar-label">
                    <bar.icon size={13} style={{ color: bar.color }} />
                    {bar.label}
                  </span>
                  <span className="match-bar-value">{bar.score} / {bar.max} pts</span>
                </div>
                <div className="match-bar-track">
                  <div
                    className="match-bar-fill"
                    style={{ width: `${pct}%`, backgroundColor: bar.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Reasons list */}
        {reasons.length > 0 && (
          <div className="match-reasons-box">
            <h5 className="match-subsection-title">
              <Sparkles size={14} className="text-accent" /> Why you matched
            </h5>
            <ul className="match-reasons-list">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
