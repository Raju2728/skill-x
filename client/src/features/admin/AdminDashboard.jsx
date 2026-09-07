import { useState, useEffect } from 'react';
import {
  Shield, Users, BookOpen, Calendar, AlertTriangle, Activity,
  Search, Plus, Trash2, CheckCircle2, XCircle, UserX, UserCheck
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'skills' | 'reports' | 'logs'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Users tab state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Skills tab state
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Programming & Tech');

  // Reports & Logs
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, skillsRes, reportsRes, logsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getSkills(),
        adminAPI.getReports(),
        adminAPI.getAuditLogs(),
      ]);

      setStats(statsRes.data?.stats || null);
      setUsers(usersRes.data?.users || []);
      setSkills(skillsRes.data?.skills || []);
      setReports(reportsRes.data?.reports || []);
      setAuditLogs(logsRes.data?.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      await adminAPI.updateUser(userId, { status: newStatus });
      toast.success('User updated', `Account status changed to ${newStatus}.`);
      loadData();
    } catch (err) {
      toast.error('Update failed', 'Could not update user status.');
    }
  };

  const handleCreateSkill = async (e) => {
    e?.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      await adminAPI.createSkill({
        name: newSkillName.trim(),
        category: newSkillCategory,
        popularity: 10,
      });
      toast.success('Skill created', `Added "${newSkillName}" to skill catalog.`);
      setShowSkillModal(false);
      setNewSkillName('');
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to create skill');
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      await adminAPI.deleteSkill(skillId);
      toast.success('Skill deleted', 'Skill removed from catalog.');
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to delete skill');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="admin-dashboard-page animate-fade-in">
      <div className="admin-header">
        <div className="flex items-center gap-3">
          <div className="admin-shield-icon">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="admin-title">Admin Management Console</h1>
            <p className="admin-subtitle">System metrics, community moderation, catalog curation, and security audit logs.</p>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="admin-stats-grid">
        <Card variant="surface" padding="md" className="admin-stat-card">
          <Users size={24} className="text-accent" />
          <div className="admin-stat-info">
            <span className="admin-stat-val">{stats?.totalUsers || 0}</span>
            <span className="admin-stat-lbl">Total Registered Users</span>
          </div>
        </Card>

        <Card variant="surface" padding="md" className="admin-stat-card">
          <Activity size={24} className="text-success" />
          <div className="admin-stat-info">
            <span className="admin-stat-val">{stats?.activeConnections || 0}</span>
            <span className="admin-stat-lbl">Active Partnerships</span>
          </div>
        </Card>

        <Card variant="surface" padding="md" className="admin-stat-card">
          <Calendar size={24} className="text-warning" />
          <div className="admin-stat-info">
            <span className="admin-stat-val">{stats?.completedSessions || 0}</span>
            <span className="admin-stat-lbl">Sessions Completed</span>
          </div>
        </Card>

        <Card variant="surface" padding="md" className="admin-stat-card">
          <BookOpen size={24} className="text-accent-secondary" />
          <div className="admin-stat-info">
            <span className="admin-stat-val">{stats?.totalSkills || 0}</span>
            <span className="admin-stat-lbl">Curated Skills</span>
          </div>
        </Card>
      </div>

      {/* Admin Nav Tabs */}
      <div className="admin-tabs-bar">
        <button
          type="button"
          className={`admin-tab ${activeTab === 'overview' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} /> Overview
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === 'users' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Users ({users.length})
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === 'skills' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <BookOpen size={16} /> Skills ({skills.length})
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === 'reports' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <AlertTriangle size={16} /> Reports ({reports.length})
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === 'logs' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Shield size={16} /> Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="admin-panel-content">
        {/* 1. Overview */}
        {activeTab === 'overview' && (
          <div className="admin-overview-grid animate-fade-in">
            <Card variant="surface" padding="md">
              <h3 className="admin-section-title">Most Popular Skills</h3>
              <div className="admin-popular-skills-list">
                {stats?.topSkills?.map((sk, i) => (
                  <div key={sk._id} className="popular-skill-row">
                    <span className="popular-skill-rank">#{i + 1}</span>
                    <span className="popular-skill-name">{sk.name}</span>
                    <Badge variant="primary" size="sm">{sk.category}</Badge>
                    <span className="popular-skill-pop">{sk.popularity} exchanges</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="surface" padding="md">
              <h3 className="admin-section-title">Security & System Health</h3>
              <div className="system-health-list">
                <div className="health-row">
                  <span>Database Status</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} /> Connected (MongoDB)
                  </span>
                </div>
                <div className="health-row">
                  <span>WebRTC STUN / Signaling</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} /> Active (Google STUN)
                  </span>
                </div>
                <div className="health-row">
                  <span>E2EE Crypto Subsystem</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} /> Operational (ECDH P-256)
                  </span>
                </div>
                <div className="health-row">
                  <span>Suspended Accounts</span>
                  <span className="font-medium">{stats?.suspendedUsers || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 2. Users Management */}
        {activeTab === 'users' && (
          <div className="admin-table-container animate-fade-in">
            <div className="admin-table-controls">
              <Input
                icon={Search}
                placeholder="Search users by name, username, or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Level / XP</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u =>
                  u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.email.toLowerCase().includes(userSearch.toLowerCase())
                ).map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatar} name={u.name} size="sm" />
                        <div>
                          <strong className="text-xs block">{u.name}</strong>
                          <span className="text-10 text-tertiary">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={u.role === 'admin' ? 'primary' : 'default'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'} size="sm">
                        {u.status}
                      </Badge>
                    </td>
                    <td className="text-xs">Lvl {u.level || 1} ({u.xp || 0} XP)</td>
                    <td className="text-xs text-tertiary">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      {u.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={UserX}
                          onClick={() => handleUpdateUserStatus(u._id, 'suspended')}
                          className="text-danger"
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={UserCheck}
                          onClick={() => handleUpdateUserStatus(u._id, 'active')}
                          className="text-success"
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Skill Catalog */}
        {activeTab === 'skills' && (
          <div className="admin-table-container animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <Input
                icon={Search}
                placeholder="Search skills catalog..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
              <Button icon={Plus} onClick={() => setShowSkillModal(true)}>
                Add New Skill
              </Button>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Skill Name</th>
                  <th>Category</th>
                  <th>Popularity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase())).map(sk => (
                  <tr key={sk._id}>
                    <td><strong>{sk.name}</strong></td>
                    <td><Badge variant="primary" size="sm">{sk.category}</Badge></td>
                    <td>{sk.popularity}</td>
                    <td><Badge variant="success" size="sm">{sk.status}</Badge></td>
                    <td>
                      <button
                        type="button"
                        className="admin-action-icon-btn text-danger"
                        onClick={() => handleDeleteSkill(sk._id)}
                        aria-label="Delete skill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Audit Logs */}
        {activeTab === 'logs' && (
          <div className="admin-table-container animate-fade-in">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log._id}>
                    <td className="text-xs text-tertiary">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar src={log.actor?.avatar} name={log.actor?.name} size="xs" />
                        <span className="text-xs">{log.actor?.name || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="audit-action-tag">{log.action}</span>
                    </td>
                    <td className="text-xs">{log.targetType || '-'}</td>
                    <td className="text-xs text-tertiary font-mono">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Skill Modal */}
      <Modal
        isOpen={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        title="Add Catalog Skill"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSkillModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSkill}>Save Skill</Button>
          </>
        }
      >
        <form onSubmit={handleCreateSkill} className="flex flex-col gap-4">
          <Input
            label="Skill Name"
            placeholder="e.g. Next.js, Kotlin, French..."
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            required
          />

          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="scheduler-select"
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
            >
              <option value="Programming & Tech">Programming & Tech</option>
              <option value="Design & Creative">Design & Creative</option>
              <option value="Languages">Languages</option>
              <option value="Music & Audio">Music & Audio</option>
              <option value="Business & Marketing">Business & Marketing</option>
              <option value="Academics & Sciences">Academics & Sciences</option>
              <option value="Lifestyle & Wellness">Lifestyle & Wellness</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
