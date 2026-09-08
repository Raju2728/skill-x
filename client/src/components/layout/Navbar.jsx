import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Logo from '../ui/Logo';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Skill X Home">
          <Logo size="md" />
        </Link>

        <div className="navbar-links md-hidden-flex">
          <a href="#features" className="navbar-link">Features</a>
          <a href="#how-it-works" className="navbar-link">How It Works</a>
          <a href="#testimonials" className="navbar-link">Testimonials</a>
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <Link to="/app/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/app/profile" className="navbar-profile-link">
                <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" />
                <span className="navbar-profile-name">{user?.name?.split(' ')[0] || 'Profile'}</span>
              </Link>
            </>
          ) : (
            !isAuthPage && (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" iconRight={ArrowRight}>Get Started</Button>
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
