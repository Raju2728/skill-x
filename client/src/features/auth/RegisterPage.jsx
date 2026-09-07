import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AtSign, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './AuthPages.css';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '', agreeTerms: false,
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
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Only letters, numbers, underscores';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords don\'t match';
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms';
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
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
      });
      navigate('/app/profile/setup', { replace: true });
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-container auth-container-wide animate-fade-in-up">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <Sparkles size={24} />
            <span>Skill X</span>
          </Link>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start exchanging skills and growing together</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {googleOAuth && (
            <>
              <button type="button" className="google-btn" onClick={handleGoogleLogin}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>
            </>
          )}

          {errors.general && <div className="auth-error">{errors.general}</div>}

          <div className="auth-row">
            <Input
              label="Full Name"
              name="name"
              icon={User}
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
            />
            <Input
              label="Username"
              name="username"
              icon={AtSign}
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              error={errors.username}
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            icon={Mail}
            placeholder="john@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />

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
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              icon={Lock}
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
            />
          </div>

          <label className="auth-terms">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={form.agreeTerms}
              onChange={handleChange}
            />
            <span>
              I agree to the <a href="#terms" className="auth-link-primary">Terms of Service</a>{' '}
              and <a href="#privacy" className="auth-link-primary">Privacy Policy</a>
            </span>
          </label>
          {errors.agreeTerms && <span className="auth-error-small">{errors.agreeTerms}</span>}

          <Button type="submit" fullWidth loading={loading} size="lg">
            Create Account
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link-primary">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
