import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Search, Users, MessageCircle, Calendar,
  BookOpen, Star, Shield, ChevronLeft, ChevronRight,
  LogOut, UserCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import Logo from '../ui/Logo';
import './Sidebar.css';

const navItems = [
  { path: '/app/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/app/discover', icon: Search, label: 'Discover' },
  { path: '/app/matches', icon: Users, label: 'Matches' },
  { path: '/app/connections', icon: Users, label: 'Connections' },
  { path: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/app/sessions', icon: Calendar, label: 'Sessions' },
  { path: '/app/learning', icon: BookOpen, label: 'Learning' },
  { path: '/app/reviews', icon: Star, label: 'Reviews' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Logo size="sm" showText={!collapsed} />
        </div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {user?.role === 'admin' && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">{!collapsed && 'Admin'}</div>
            <NavLink
              to="/app/admin"
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              title={collapsed ? 'Admin' : undefined}
            >
              <Shield size={20} />
              {!collapsed && <span>Admin Panel</span>}
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/app/profile"
          className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          title={collapsed ? 'Profile' : undefined}
        >
          <UserCircle size={20} />
          {!collapsed && <span>Profile</span>}
        </NavLink>

        <div className="sidebar-user">
          <NavLink
            to="/app/profile"
            className="sidebar-user-info"
            title={collapsed ? user?.name : undefined}
          >
            <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" />
            {!collapsed && (
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">{user?.name || 'User'}</span>
                <span className="sidebar-user-role">@{user?.username || 'user'}</span>
              </div>
            )}
          </NavLink>
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

