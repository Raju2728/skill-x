import { Home, Users, BookOpen, Calendar, TrendingUp, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import './DashboardPage.css';

const quickStats = [
  { icon: Users, label: 'Connections', value: '0', color: 'var(--accent-primary)' },
  { icon: MessageCircle, label: 'Messages', value: '0', color: 'var(--success)' },
  { icon: Calendar, label: 'Sessions', value: '0', color: 'var(--warning)' },
  { icon: BookOpen, label: 'Skills', value: '0', color: 'var(--accent-secondary)' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Welcome back, <span className="text-accent">{user?.name?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="dashboard-subtitle">Here's an overview of your skill exchange activity</p>
        </div>
      </div>

      <div className="dashboard-stats stagger-children">
        {quickStats.map((stat) => (
          <Card key={stat.label} variant="surface" padding="md" className="stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card variant="surface" padding="md" className="dashboard-card">
          <h3 className="dashboard-card-title">
            <TrendingUp size={18} />
            Recent Activity
          </h3>
          <div className="dashboard-empty">
            <p>No recent activity yet. Start by discovering skill exchange partners!</p>
          </div>
        </Card>

        <Card variant="surface" padding="md" className="dashboard-card">
          <h3 className="dashboard-card-title">
            <Calendar size={18} />
            Upcoming Sessions
          </h3>
          <div className="dashboard-empty">
            <p>No upcoming sessions. Schedule one with a connection!</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
