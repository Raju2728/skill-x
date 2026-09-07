import { useState, useEffect } from 'react';
import {
  BookOpen, Plus, CheckCircle2, Circle, Trophy, Award,
  Sparkles, TrendingUp, Target, Clock, Calendar
} from 'lucide-react';
import { learningAPI, skillAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';
import './LearningPage.css';

export default function LearningPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [goals, setGoals] = useState([]);
  const [progressOverview, setProgressOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // New goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMilestones, setNewMilestones] = useState(['', '', '']);
  const [targetLevel, setTargetLevel] = useState('intermediate');
  const [savingGoal, setSavingGoal] = useState(false);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      const [goalsRes, progRes] = await Promise.all([
        learningAPI.getGoals(),
        learningAPI.getProgress(),
      ]);

      setGoals(goalsRes.data?.goals || []);
      setProgressOverview(progRes.data?.progress || null);
    } catch (err) {
      console.error('Failed to load learning goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLearningData();
  }, []);

  const handleToggleMilestone = async (goalId, milestoneIndex) => {
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const nextMilestones = goal.milestones.map((m, idx) => {
      if (idx === milestoneIndex) {
        return { ...m, completed: !m.completed, completedAt: !m.completed ? new Date() : null };
      }
      return m;
    });

    try {
      const { data } = await learningAPI.updateGoal(goalId, { milestones: nextMilestones });
      setGoals(prev => prev.map(g => g._id === goalId ? data.goal : g));
      toast.success('Milestone updated! 🎯', '+25 XP earned for progress.');
      await refreshUser();
      loadLearningData();
    } catch (err) {
      toast.error('Update failed', 'Could not save milestone status.');
    }
  };

  const handleCreateGoal = async (e) => {
    e?.preventDefault();
    if (!newTitle.trim()) return;

    const validMilestones = newMilestones.filter(m => m.trim().length > 0);
    if (validMilestones.length === 0) {
      toast.warning('Add milestones', 'Please add at least 1 milestone task for your goal.');
      return;
    }

    setSavingGoal(true);
    try {
      await learningAPI.createGoal({
        title: newTitle.trim(),
        targetLevel,
        milestones: validMilestones,
      });

      toast.success('Goal created!', 'Your new learning objective has been tracked.');
      setShowGoalModal(false);
      setNewTitle('');
      setNewMilestones(['', '', '']);
      loadLearningData();
    } catch (err) {
      toast.error('Error', err.response?.data?.message || 'Could not create goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const nextLevelXP = userLevel * 100;
  const currentLevelBaseXP = (userLevel - 1) * 100;
  const levelProgressPct = Math.min(100, Math.round(((userXP - currentLevelBaseXP) / 100) * 100));

  return (
    <div className="learning-page animate-fade-in">
      <div className="learning-header">
        <div>
          <h1 className="learning-title">Learning Goals & Growth</h1>
          <p className="learning-subtitle">
            Track your milestones, level up your skills, and earn XP for active collaborative learning.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowGoalModal(true)}>
          Add Learning Goal
        </Button>
      </div>

      {/* Gamification Level & Stats Card */}
      <div className="learning-stats-banner">
        <div className="level-card-left">
          <div className="level-badge-wrap">
            <Trophy size={28} className="text-warning" />
            <div className="level-badge-info">
              <span className="level-num">Level {userLevel}</span>
              <span className="xp-text">{userXP} Total XP</span>
            </div>
          </div>

          <div className="level-progress-bar-wrap">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-secondary">Progress to Level {userLevel + 1}</span>
              <strong>{userXP % 100} / 100 XP</strong>
            </div>
            <div className="level-progress-track">
              <div className="level-progress-fill" style={{ width: `${levelProgressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="learning-stats-grid">
          <div className="learning-stat-box">
            <span className="stat-num">{progressOverview?.totalSessionsCompleted || 0}</span>
            <span className="stat-lbl"><Calendar size={12} /> Sessions</span>
          </div>
          <div className="learning-stat-box">
            <span className="stat-num">{progressOverview?.totalHoursLearned || 0}h</span>
            <span className="stat-lbl"><Clock size={12} /> Hours Exchanged</span>
          </div>
          <div className="learning-stat-box">
            <span className="stat-num text-success">{progressOverview?.completedGoals || 0}</span>
            <span className="stat-lbl"><CheckCircle2 size={12} /> Goals Mastered</span>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="learning-goals-section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="section-title-sm">Active Learning Goals ({goals.length})</h3>
        </div>

        {loading ? (
          <PageLoader />
        ) : goals.length === 0 ? (
          <div className="goals-empty-state">
            <Target size={48} className="text-tertiary mb-3" />
            <h3>No learning goals created yet</h3>
            <p>Set structured objectives and milestone checklists to track your skill progression.</p>
            <Button icon={Plus} onClick={() => setShowGoalModal(true)} className="mt-4">
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <div className="goals-grid">
            {goals.map(goal => {
              const isDone = goal.status === 'completed' || goal.progressPercent === 100;
              return (
                <Card key={goal._id} variant="surface" padding="md" className="goal-card">
                  <div className="goal-card-header">
                    <div className="goal-title-col">
                      <h4 className="goal-title">{goal.title}</h4>
                      <Badge variant={isDone ? 'success' : 'primary'} size="sm">
                        {isDone ? 'Completed' : `Target: ${goal.targetLevel}`}
                      </Badge>
                    </div>
                    <div className="goal-pct-circle">
                      <span>{goal.progressPercent || 0}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="goal-bar-track">
                    <div
                      className={`goal-bar-fill ${isDone ? 'goal-bar-fill-done' : ''}`}
                      style={{ width: `${goal.progressPercent || 0}%` }}
                    />
                  </div>

                  {/* Milestone Checklist */}
                  <div className="goal-milestones-list">
                    <span className="milestones-heading">Milestones:</span>
                    {goal.milestones.map((m, mIdx) => (
                      <button
                        key={mIdx}
                        type="button"
                        className={`milestone-item-btn ${m.completed ? 'milestone-done' : ''}`}
                        onClick={() => handleToggleMilestone(goal._id, mIdx)}
                      >
                        {m.completed ? (
                          <CheckCircle2 size={16} className="text-success" />
                        ) : (
                          <Circle size={16} className="text-tertiary" />
                        )}
                        <span className="milestone-title">{m.title}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Goal Modal */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Add Learning Goal"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowGoalModal(false)}>Cancel</Button>
            <Button icon={Sparkles} onClick={handleCreateGoal} loading={savingGoal}>
              Create Goal
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateGoal} className="new-goal-form">
          <Input
            label="Goal Objective Title"
            placeholder="e.g. Master React Hooks & State Management"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />

          <div className="input-group">
            <label className="input-label">Target Mastery Level</label>
            <select
              className="scheduler-select"
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
            >
              <option value="beginner">Beginner Fundamentals</option>
              <option value="intermediate">Intermediate Proficiency</option>
              <option value="advanced">Advanced Mastery</option>
              <option value="expert">Expert / Industry Ready</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Milestone Steps</label>
            <div className="milestones-inputs-list">
              {newMilestones.map((ms, idx) => (
                <Input
                  key={idx}
                  placeholder={`Step ${idx + 1}: e.g. Build 2 custom hooks`}
                  value={ms}
                  onChange={(e) => {
                    const next = [...newMilestones];
                    next[idx] = e.target.value;
                    setNewMilestones(next);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="add-milestone-link"
              onClick={() => setNewMilestones([...newMilestones, ''])}
            >
              + Add another milestone step
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
