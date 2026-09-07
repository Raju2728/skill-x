import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Check, X, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import './RequestCard.css';

export default function RequestCard({
  request,
  isIncoming = false,
  onAccept,
  onReject,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);
  const partner = isIncoming ? request.sender : request.receiver;

  const handleAction = async (actionFn) => {
    setLoading(true);
    try {
      await actionFn(request._id);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = {
    pending: <Badge variant="warning" size="sm"><Clock size={10} /> Pending</Badge>,
    accepted: <Badge variant="success" size="sm"><Check size={10} /> Accepted</Badge>,
    rejected: <Badge variant="danger" size="sm"><X size={10} /> Declined</Badge>,
    cancelled: <Badge variant="default" size="sm">Cancelled</Badge>,
  }[request.status];

  return (
    <Card variant="surface" padding="none" className="request-card animate-fade-in">
      <div className="request-card-header">
        <div className="request-partner-row">
          <Avatar src={partner?.avatar} name={partner?.name} size="md" />
          <div className="request-name-col">
            <Link to={`/app/profile/${partner?._id}`} className="request-name">
              {partner?.name}
            </Link>
            <span className="text-xs text-secondary">@{partner?.username}</span>
          </div>
        </div>
        <div className="request-status-wrap">
          {statusBadge}
        </div>
      </div>

      <div className="request-card-body">
        {/* Exchange skills detail */}
        <div className="request-skills-exchange">
          <div className="request-skill-block">
            <span className="request-skill-lbl">
              <Award size={13} className="text-accent" />
              {isIncoming ? `${partner?.name?.split(' ')[0]} offers:` : 'You offer:'}
            </span>
            <div className="request-chips-row">
              {(request.skillsOffered || []).map(s => (
                <span key={s._id || s} className="request-chip request-chip-offer">
                  {s.name || s}
                </span>
              ))}
            </div>
          </div>

          <div className="request-skill-block">
            <span className="request-skill-lbl">
              <BookOpen size={13} className="text-accent-secondary" />
              {isIncoming ? 'Requests from you:' : 'Requested from partner:'}
            </span>
            <div className="request-chips-row">
              {(request.skillsRequested || []).map(s => (
                <span key={s._id || s} className="request-chip request-chip-request">
                  {s.name || s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {request.message && (
          <div className="request-message-quote">
            <MessageSquare size={13} className="text-tertiary" />
            <p>"{request.message}"</p>
          </div>
        )}
      </div>

      {request.status === 'pending' && (
        <div className="request-card-footer">
          {isIncoming ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => handleAction(onReject)}
                loading={loading}
              >
                Decline
              </Button>
              <Button
                size="sm"
                icon={Check}
                onClick={() => handleAction(onAccept)}
                loading={loading}
              >
                Accept Exchange
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction(onCancel)}
              loading={loading}
            >
              Cancel Proposal
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
