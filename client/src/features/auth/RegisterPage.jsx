import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AtSign, Globe, Video, Share2, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Logo from '../../components/ui/Logo';
import './AuthPages.css';

const benefits = [
  { title: 'Global Learning Network', desc: 'Exchange skills with developers, designers, and creators worldwide.' },
  { title: 'Interactive Peer Sessions', desc: 'Seamless voice, video, and collaborative whiteboard in one place.' },
  { title: 'Skill Currency & Badges', desc: 'Build your verified portfolio through peer endorsements and reviews.' },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleOAuth, setGoogleOAuth] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authAPI.getConfig().then(({ data }) => {
      setGoogleOAuth(data.googleOAuth);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: '', general: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.username.trim()) {
      errs.username = 'Username is required';
    } else if (form.username.length < 3 || form.username.length > 30) {
      errs.username = 'Between 3 and 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      errs.username = 'Only letters, numbers, and underscores';
    }
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'At least 8 characters required';
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!form.agreeTerms) {
      errs.agreeTerms = 'You must accept the terms of service';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate('/app/profile/setup', { replace: true });
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Registration failed. Please try again.' });
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
              <Sparkles size={14} /> Join the Movement
            </div>
            <h2 className="auth-left-title">
              Start Your Skill<br />Exchange Journey.
            </h2>
            <p className="auth-left-tagline">
              Join thousands of curious learners sharing knowledge, learning languages, coding, design, and more.
            </p>
          </div>

          <div className="auth-left-features">
            {benefits.map((b) => (
              <div key={b.title} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div className="auth-feature-text">
                  <h4>{b.title}</h4>
                  <p>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-left-footer">
            <div className="auth-left-stat">
              <span className="auth-stat-num">100% Free</span>
              <span className="auth-stat-desc">Peer Knowledge Sharing</span>
            </div>
            <div className="auth-left-stat">
              <span className="auth-stat-num">50+ Countries</span>
              <span className="auth-stat-desc">Global Learner Base</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-right-panel">
          <div className="auth-container auth-container-wide">
            <div className="auth-header">
              <Link to="/" className="auth-logo" aria-label="Skill X Home">
                <Logo size="md" />
              </Link>
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">Get started with your free Skill X profile</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {errors.general && <div className="auth-error">{errors.general}</div>}

              {/* Responsive Row for Name & Username */}
              <div className="auth-row">
                <Input
                  label="Full Name"
                  name="name"
                  icon={User}
                  placeholder="e.g. Alex Chen"
                  value={form.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />

                <Input
                  label="Username"
                  name="username"
                  icon={AtSign}
                  placeholder="e.g. alex_chen"
                  value={form.username}
                  onChange={handleChange}
                  error={errors.username}
                  required
                />
              </div>

              <Input
                label="Email Address"
                name="email"
                type="email"
                icon={Mail}
                placeholder="alex@example.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                autoComplete="email"
                required
              />

              {/* Responsive Row for Password & Confirm Password */}
              <div className="auth-row">
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  icon={Lock}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoComplete="new-password"
                  required
                />

                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  icon={Lock}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="auth-terms">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={form.agreeTerms}
                    onChange={handleChange}
                  />
                  <span>
                    I agree to the <Link to="/terms" className="auth-link-primary">Terms of Service</Link> and <Link to="/privacy" className="auth-link-primary">Privacy Policy</Link>
                  </span>
                </label>
                {errors.agreeTerms && <span className="auth-error-small">{errors.agreeTerms}</span>}
              </div>

              <Button type="submit" fullWidth loading={loading} size="lg">
                Create Free Account
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
                    <span>Sign up with Google</span>
                  </button>
                </>
              )}
            </form>

            <p className="auth-footer">
              Already have an account?{' '}
              <Link to="/login" className="auth-link-primary">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
