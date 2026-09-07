import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRightLeft, Info, MapPin, Award, BookOpen, Star
} from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import MatchExplanation from './MatchExplanation';
import './MatchCard.css';

export default function MatchCard({ match }) {
  const navigate = useNavigate();
  const [showExplanation, setShowExplanation] = useState(false);

  const { partner, overallScore = 0, aTeachesB = [], bTeachesA = [], isMutual } = match;

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--accent-primary)';
    return 'var(--warning)';
  };

  return (
    <>
      <Card variant="surface" padding="none" className="match-card animate-fade-in">
        {/* Match Header with circular progress/badge */}
        <div className="match-card-header">
          <div className="match-user-meta">
            <Avatar
              src={partner?.avatar}
              name={partner?.name}
              size="lg"
              online={partner?.privacySettings?.showOnlineStatus ? true : undefined}
            />
            <div className="match-name-col">
              <Link to={`/app/profile/${partner?._id}`} className="match-name">
                {partner?.name}
              </Link>
              <span className="match-username">@{partner?.username}</span>
              {partner?.location && (
                <span className="match-location">
                  <MapPin size={11} /> {partner.location}
                </span>
              )}
            </div>
          </div>

          <div className="match-score-pill" style={{ borderColor: getScoreColor(overallScore) }}>
            <span className="match-score-num" style={{ color: getScoreColor(overallScore) }}>
              {overallScore}%
            </span>
            <span className="match-score-tag">Match</span>
          </div>
        </div>

        {/* Exchange Compatibility Box */}
        <div className="match-card-body">
          {isMutual && (
            <div className="mutual-match-badge">
              <Sparkles size={13} />
              <span>Perfect 2-Way Mutual Exchange</span>
            </div>
          )}

          <div className="match-synergy-grid">
            <div className="synergy-row">
              <span className="synergy-label">
                <Award size={13} className="text-accent" /> You Teach:
              </span>
              <span className="synergy-val">
                {aTeachesB.length > 0 ? aTeachesB.join(', ') : 'Complementary topics'}
              </span>
            </div>

            <div className="synergy-row">
              <span className="synergy-label">
                <BookOpen size={13} className="text-accent-secondary" /> You Learn:
              </span>
              <span className="synergy-val">
                {bTeachesA.length > 0 ? bTeachesA.join(', ') : 'Complementary topics'}
              </span>
            </div>
          </div>

          <p className="match-bio-preview line-clamp-2">
            {partner?.bio || 'Passionate skill exchange enthusiast.'}
          </p>
        </div>

        {/* Footer with actions */}
        <div className="match-card-footer">
          <button
            type="button"
            className="match-why-btn"
            onClick={() => setShowExplanation(true)}
          >
            <Info size={14} /> Why you matched
          </button>

          <Button
            size="sm"
            icon={Sparkles}
            onClick={() => navigate('/app/connections', { state: { requestPartner: partner } })}
          >
            Connect
          </Button>
        </div>
      </Card>

      {/* Breakdown explanation modal */}
      <MatchExplanation
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        explanation={match}
      />
    </>
  );
}
