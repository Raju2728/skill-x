import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, UsersRound, MessageSquareText, CalendarRange,
  BookOpenText, Star, ShieldCheck, ChevronLeft, ChevronRight,
  LogOut, UserRoundCog, MoreHorizontal, X, Compass, Handshake,
  GraduationCap, MessageCircleHeart,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import './Sidebar.css';

// All nav items for desktop sidebar (unchanged)
const allNavItems = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/discover', icon: Compass, label: 'Discover' },
  { path: '/app/matches', icon: Handshake, label: 'Matches' },
  { path: '/app/connections', icon: UsersRound, label: 'Connections' },
  { path: '/app/chat', icon: MessageSquareText, label: 'Chat' },
  { path: '/app/sessions', icon: CalendarRange, label: 'Sessions' },
  { path: '/app/learning', icon: GraduationCap, label: 'Learning' },
  { path: '/app/reviews', icon: MessageCircleHeart, label: 'Reviews' },
];

// Mobile: Only these 4 appear as primary bottom tabs
const mobilePrimaryItems = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/chat', icon: MessageSquareText, label: 'Chat' },
  { path: '/app/connections', icon: UsersRound, label: 'Connections' },
  { path: '/app/sessions', icon: CalendarRange, label: 'Sessions' },
];

// Mobile: These go inside the "More" sheet
const moreMenuItems = [
  { path: '/app/discover', icon: Compass, label: 'Discover' },
  { path: '/app/matches', icon: Handshake, label: 'Matches' },
  { path: '/app/learning', icon: GraduationCap, label: 'Learning' },
  { path: '/app/reviews', icon: MessageCircleHeart, label: 'Reviews' },
];

export default function Sidebar({ collapsed, onToggle, isMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    navigate('/login');
  };

  // Close "More" sheet when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [moreOpen]);

  // Close More sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [navigate]);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ======================== DESKTOP SIDEBAR ======================== */}
      <div className="sidebar-desktop-content">
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
            {allNavItems.map(item => (
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
                <ShieldCheck size={20} />
                {!collapsed && <span>Admin Panel</span>}
              </NavLink>
            </div>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-theme-row">
            {!collapsed && <span className="sidebar-theme-label">Theme</span>}
            <ThemeToggle />
          </div>

          <NavLink
            to="/app/profile"
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            title={collapsed ? 'Profile' : undefined}
          >
            <UserRoundCog size={20} />
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
      </div>

      {/* ======================== MOBILE BOTTOM NAV ======================== */}
      <div className="sidebar-mobile-nav">
        {mobilePrimaryItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-mobile-tab ${isActive ? 'sidebar-mobile-tab-active' : ''}`}
          >
            <item.icon size={20} strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          type="button"
          className={`sidebar-mobile-tab sidebar-more-btn ${moreOpen ? 'sidebar-mobile-tab-active' : ''}`}
          onClick={() => setMoreOpen(prev => !prev)}
          aria-label="More options"
        >
          {moreOpen ? <X size={20} strokeWidth={1.8} /> : <MoreHorizontal size={20} strokeWidth={1.8} />}
          <span>More</span>
        </button>

        {/* More slide-up sheet */}
        {moreOpen && (
          <>
            <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)} />
            <div className="more-sheet" ref={moreRef}>
              <div className="more-sheet-handle" />

              <div className="more-sheet-section">
                <span className="more-sheet-section-title">Navigation</span>
                {moreMenuItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `more-sheet-link ${isActive ? 'more-sheet-link-active' : ''}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <div className="more-sheet-icon-wrap">
                      <item.icon size={20} strokeWidth={1.8} />
                    </div>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="more-sheet-divider" />

              <div className="more-sheet-section">
                <span className="more-sheet-section-title">Preferences</span>
                <div className="more-sheet-theme-row">
                  <div className="more-sheet-theme-info">
                    <div className="more-sheet-icon-wrap">
                      <UserRoundCog size={18} strokeWidth={1.8} style={{ display: 'none' }} />
                      <span className="more-sheet-theme-icon">🎨</span>
                    </div>
                    <span>Theme</span>
                  </div>
                  <ThemeToggle />
                </div>
              </div>

              <div className="more-sheet-divider" />

              <div className="more-sheet-section">
                <span className="more-sheet-section-title">Account</span>
                <NavLink
                  to="/app/profile"
                  className={({ isActive }) => `more-sheet-link ${isActive ? 'more-sheet-link-active' : ''}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <div className="more-sheet-icon-wrap">
                    <UserRoundCog size={20} strokeWidth={1.8} />
                  </div>
                  <span>Profile</span>
                </NavLink>

                {user?.role === 'admin' && (
                  <NavLink
                    to="/app/admin"
                    className={({ isActive }) => `more-sheet-link ${isActive ? 'more-sheet-link-active' : ''}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <div className="more-sheet-icon-wrap more-sheet-icon-admin">
                      <ShieldCheck size={20} strokeWidth={1.8} />
                    </div>
                    <span>Admin Panel</span>
                  </NavLink>
                )}

                <button
                  type="button"
                  className="more-sheet-link more-sheet-logout"
                  onClick={handleLogout}
                >
                  <div className="more-sheet-icon-wrap more-sheet-icon-danger">
                    <LogOut size={20} strokeWidth={1.8} />
                  </div>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

