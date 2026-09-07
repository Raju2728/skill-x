import { useState } from 'react';
import { Star, Send, Sparkles } from 'lucide-react';
import { reviewAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import './RatingForm.css';

const categoriesList = [
  { key: 'knowledge', label: 'Subject Knowledge', desc: 'Expertise and depth of understanding in the skill' },
  { key: 'communication', label: 'Communication & Clarity', desc: 'Explanation clarity and constructive listening' },
  { key: 'punctuality', label: 'Punctuality & Reliability', desc: 'On time for the scheduled session' },
  { key: 'helpfulness', label: 'Helpfulness & Patience', desc: 'Patience and encouragement throughout the exchange' },
];

export default function RatingForm({
  sessionId,
  reviewee,
  onSuccess,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState({
    knowledge: 5,
    communication: 5,
    punctuality: 5,
    helpfulness: 5,
  });
  const [comment, setComment] = useState('');

  const setCategoryRating = (catKey, stars) => {
    setRatings(prev => ({ ...prev, [catKey]: stars }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!sessionId || !reviewee?._id) return;

    setLoading(true);
    try {
      await reviewAPI.create({
        sessionId,
        revieweeId: reviewee._id,
        categories: ratings,
        comment: comment.trim(),
      });

      toast.success('Review submitted! ⭐', 'Thank you for helping keep the Skill X community trustworthy.');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error('Review failed', err.response?.data?.message || 'Could not submit review.');
    } finally {
      setLoading(false);
    }
  };

  const overallAvg = (
    (ratings.knowledge + ratings.communication + ratings.punctuality + ratings.helpfulness) / 4
  ).toFixed(1);

  return (
    <form onSubmit={handleSubmit} className="rating-form animate-fade-in">
      <div className="rating-form-header">
        <Avatar src={reviewee?.avatar} name={reviewee?.name} size="lg" />
        <div>
          <h4>Rate your session with {reviewee?.name}</h4>
          <p className="text-xs text-secondary">
            Overall Rating: <strong>{overallAvg} / 5.0</strong>
          </p>
        </div>
      </div>

      {/* 4 Multi-criteria 5-star ratings */}
      <div className="rating-criteria-list">
        {categoriesList.map(cat => {
          const currentStar = ratings[cat.key];
          return (
            <div key={cat.key} className="rating-criteria-row">
              <div className="rating-criteria-label">
                <span className="font-medium text-xs">{cat.label}</span>
                <span className="text-tertiary text-10">{cat.desc}</span>
              </div>

              <div className="rating-stars-group">
                {[1, 2, 3, 4, 5].map(starNum => (
                  <button
                    key={starNum}
                    type="button"
                    className={`star-btn ${starNum <= currentStar ? 'star-btn-active' : ''}`}
                    onClick={() => setCategoryRating(cat.key, starNum)}
                    aria-label={`${starNum} stars for ${cat.label}`}
                  >
                    <Star size={18} fill={starNum <= currentStar ? '#f5a623' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Written Feedback */}
      <div className="input-group">
        <label className="input-label">Written Feedback & Testimonial</label>
        <textarea
          className="setup-textarea"
          rows={3}
          placeholder={`What did you learn? How was ${reviewee?.name?.split(' ')[0]}'s mentoring style?`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button type="submit" icon={Send} loading={loading}>
          Submit Session Review
        </Button>
      </div>
    </form>
  );
}
