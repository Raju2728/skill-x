import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, RefreshCw, Users, Award, Calendar, CheckCircle2 } from 'lucide-react';
import { matchAPI } from '../../services/api';
import MatchCard from './MatchCard';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';
import './MatchesPage.css';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data } = await matchAPI.getMatches();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const mutualMatches = matches.filter(m => m.isMutual);
  const topSynergyMatches = matches.filter(m => m.overallScore >= 75);

  const displayedMatches = activeFilter === 'mutual'
    ? mutualMatches
    : activeFilter === 'high'
      ? topSynergyMatches
      : matches;

  return (
    <div className="matches-page animate-fade-in">
      <div className="matches-header">
        <div>
          <h1 className="matches-title">Intelligent Matches</h1>
          <p className="matches-subtitle">
            AI-matched peers tailored to your teaching skills, learning interests, and weekly schedule.
          </p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={fetchMatches} loading={loading}>
          Recalculate Matches
        </Button>
      </div>

      {/* Quick stats banner */}
      <div className="matches-stats-bar">
        <div className="match-stat-item">
          <span className="match-stat-num">{matches.length}</span>
          <span className="match-stat-label">Total Matches Found</span>
        </div>
        <div className="match-stat-divider" />
        <div className="match-stat-item">
          <span className="match-stat-num text-success">{mutualMatches.length}</span>
          <span className="match-stat-label">2-Way Mutual Exchanges</span>
        </div>
        <div className="match-stat-divider" />
        <div className="match-stat-item">
          <span className="match-stat-num text-accent">{topSynergyMatches.length}</span>
          <span className="match-stat-label">High Synergy (&ge; 75%)</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="matches-filter-tabs">
        <button
          type="button"
          className={`match-tab-btn ${activeFilter === 'all' ? 'match-tab-btn-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All Matches ({matches.length})
        </button>
        <button
          type="button"
          className={`match-tab-btn ${activeFilter === 'mutual' ? 'match-tab-btn-active' : ''}`}
          onClick={() => setActiveFilter('mutual')}
        >
          <Sparkles size={14} /> Mutual Exchanges ({mutualMatches.length})
        </button>
        <button
          type="button"
          className={`match-tab-btn ${activeFilter === 'high' ? 'match-tab-btn-active' : ''}`}
          onClick={() => setActiveFilter('high')}
        >
          Top Synergy ({topSynergyMatches.length})
        </button>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <PageLoader />
      ) : displayedMatches.length === 0 ? (
        <div className="matches-empty-card">
          <Sparkles size={48} className="text-accent mb-3" />
          <h3>No matches in this category</h3>
          <p>Add more skills you want to teach and learn to increase your compatibility pool.</p>
          <div className="mt-4 flex gap-3 justify-center">
            <Link to="/app/profile/edit">
              <Button>Update Skills & Schedule</Button>
            </Link>
            <Link to="/app/discover">
              <Button variant="secondary">Browse All Peers</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="matches-grid stagger-children">
          {displayedMatches.map(m => (
            <MatchCard key={m.partner?._id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
