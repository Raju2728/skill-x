import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Sparkles, ArrowRight, ShieldCheck, Video, Repeat } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Logo from '../../components/ui/Logo';
import './AuthPages.css';

export default function LoginPage() {
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleOAuth, setGoogleOAuth] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app/dashboard';

  useEffect(() => {
    authAPI.getConfig().then(({ data }) => {
      setGoogleOAuth(data.googleOAuth);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.emailOrUsername || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authAPI.googleAuth();
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-split-layout animate-fade-in">
        {/* Left Hero Panel */}
        <div className="auth-left-panel">
          <div className="auth-left-top">
            <div className="auth-left-badge">
              <Sparkles size={14} /> Peer-to-Peer Learning
            </div>
            <h2 className="auth-left-title">
              Exchange Skills.<br />Grow Together.
            </h2>
            <p className="auth-left-tagline">
              Connect with passionate learners and mentors across the globe. Teach what you know, learn what you love.
            </p>
          </div>

          <div className="auth-left-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Repeat size={18} />
              </div>
              <div className="auth-feature-text">
                <h4>Mutual Skill Exchange</h4>
                <p>Swap expertise without monetary barriers — give an hour, get an hour.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Video size={18} />
              </div>
              <div className="auth-feature-text">
                <h4>Live Video & Interactive Whiteboard</h4>
                <p>Engage in crystal-clear sessions with collaborative real-time tools.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="auth-feature-text">
                <h4>Verified Community & Reviews</h4>
                <p>Transparent peer feedback and skill ratings ensure top learning quality.</p>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <div className="auth-left-stat">
              <span className="auth-stat-num">10,000+</span>
              <span className="auth-stat-desc">Active Skills Exchanged</span>
            </div>
            <div className="auth-left-stat">
              <span className="auth-stat-num">4.9 / 5</span>
              <span className="auth-stat-desc">Community Satisfaction</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-right-panel">
          <div className="auth-container">
            <div className="auth-header">
              <Link to="/" className="auth-logo" aria-label="Skill X Home">
                <Logo size="md" />
              </Link>
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to your Skill X account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {error && <div className="auth-error">{error}</div>}

              <Input
                label="Email or Username"
                name="emailOrUsername"
                icon={Mail}
                placeholder="Enter your email or username"
                value={form.emailOrUsername}
                onChange={handleChange}
                autoComplete="username"
                required
              />

              <Input
                label="Password"
                name="password"
                type="password"
                icon={Lock}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <div className="auth-options">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
              </div>

              <Button type="submit" fullWidth loading={loading} size="lg">
                Sign In
              </Button>

              {googleOAuth && (
                <>
                  <div className="auth-divider">
                    <span>OR CONTINUE WITH</span>
                  </div>

                  <button type="button" className="google-btn" onClick={handleGoogleLogin}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </>
              )}
            </form>

            <p className="auth-footer">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link-primary">Sign up for free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
