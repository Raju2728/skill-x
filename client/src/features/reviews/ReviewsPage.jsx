import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Star, MessageSquare, Award, CheckCircle2, ThumbsUp } from 'lucide-react';
import { reviewAPI } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import RatingForm from './RatingForm';
import { PageLoader } from '../../components/ui/Spinner';
import './ReviewsPage.css';

export default function ReviewsPage() {
  const location = useLocation();

  const [receivedReviews, setReceivedReviews] = useState([]);
  const [writtenReviews, setWrittenReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  // Form prompt if directed from session complete
  const [pendingSessionReview, setPendingSessionReview] = useState(location.state?.session || null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data } = await reviewAPI.getByUser('me');
      setReceivedReviews(data.received || []);
      setWrittenReviews(data.written || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const totalReceived = receivedReviews.length;
  const avgRating = totalReceived > 0
    ? (receivedReviews.reduce((acc, r) => acc + r.overall, 0) / totalReceived).toFixed(1)
    : '5.0';

  return (
    <div className="reviews-page animate-fade-in">
      <div className="reviews-header">
        <div>
          <h1 className="reviews-title">Reviews & Community Standing</h1>
          <p className="reviews-subtitle">
            Feedback and ratings from your skill exchange sessions.
          </p>
        </div>
      </div>

      {/* Pending review form banner */}
      {pendingSessionReview && (
        <div className="mb-6">
          <RatingForm
            sessionId={pendingSessionReview._id}
            reviewee={pendingSessionReview.participants?.find(p => p._id !== 'me')}
            onSuccess={() => {
              setPendingSessionReview(null);
              loadReviews();
            }}
          />
        </div>
      )}

      {/* Ratings Overview Bar */}
      <div className="reviews-stats-card">
        <div className="reviews-stat-left">
          <div className="reviews-score-big">
            <span className="score-num">{avgRating}</span>
            <div className="score-stars">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  size={16}
                  fill={s <= Math.round(Number(avgRating)) ? '#f5a623' : 'none'}
                  className="text-warning"
                />
              ))}
            </div>
            <span className="score-count">Based on {totalReceived} session reviews</span>
          </div>
        </div>

        <div className="reviews-stat-breakdown">
          <div className="breakdown-item">
            <span>Knowledge & Expertise</span>
            <strong>4.9 / 5.0</strong>
          </div>
          <div className="breakdown-item">
            <span>Communication & Clarity</span>
            <strong>4.8 / 5.0</strong>
          </div>
          <div className="breakdown-item">
            <span>Punctuality & Reliability</span>
            <strong>5.0 / 5.0</strong>
          </div>
          <div className="breakdown-item">
            <span>Helpfulness & Patience</span>
            <strong>4.9 / 5.0</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="reviews-tabs">
        <button
          type="button"
          className={`reviews-tab ${activeTab === 'received' ? 'reviews-tab-active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received Reviews ({receivedReviews.length})
        </button>
        <button
          type="button"
          className={`reviews-tab ${activeTab === 'written' ? 'reviews-tab-active' : ''}`}
          onClick={() => setActiveTab('written')}
        >
          Written by You ({writtenReviews.length})
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="reviews-list">
          {activeTab === 'received' && (
            receivedReviews.length === 0 ? (
              <div className="reviews-empty">
                <Star size={40} className="text-tertiary mb-2" />
                <p>No reviews received yet. Complete sessions to build your rating!</p>
              </div>
            ) : (
              receivedReviews.map(r => (
                <Card key={r._id} variant="surface" padding="md" className="review-card">
                  <div className="review-card-top">
                    <div className="flex items-center gap-3">
                      <Avatar src={r.reviewer?.avatar} name={r.reviewer?.name} size="md" />
                      <div>
                        <strong className="text-sm block">{r.reviewer?.name}</strong>
                        <span className="text-xs text-tertiary">
                          {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="review-overall-badge">
                      <Star size={14} fill="#f5a623" className="text-warning" />
                      <span>{r.overall}</span>
                    </div>
                  </div>

                  {r.comment && (
                    <p className="review-comment-text">"{r.comment}"</p>
                  )}
                </Card>
              ))
            )
          )}

          {activeTab === 'written' && (
            writtenReviews.length === 0 ? (
              <div className="reviews-empty">
                <MessageSquare size={40} className="text-tertiary mb-2" />
                <p>You have not submitted reviews for any completed sessions yet.</p>
              </div>
            ) : (
              writtenReviews.map(r => (
                <Card key={r._id} variant="surface" padding="md" className="review-card">
                  <div className="review-card-top">
                    <div className="flex items-center gap-3">
                      <Avatar src={r.reviewee?.avatar} name={r.reviewee?.name} size="md" />
                      <div>
                        <span className="text-xs text-secondary">Review for</span>
                        <strong className="text-sm block">{r.reviewee?.name}</strong>
                      </div>
                    </div>
                    <div className="review-overall-badge">
                      <Star size={14} fill="#f5a623" className="text-warning" />
                      <span>{r.overall}</span>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="review-comment-text">"{r.comment}"</p>
                  )}
                </Card>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
