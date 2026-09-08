import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Logo from '../../components/ui/Logo';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-container animate-fade-in-up">
        <div className="auth-header">
          <Link to="/" className="auth-logo" aria-label="Skill X Home">
            <Logo size="lg" />
          </Link>
          {sent ? (
            <>
              <div className="auth-success-icon">
                <CheckCircle size={48} />
              </div>
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-subtitle">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </>
          ) : (
            <>
              <h1 className="auth-title">Reset password</h1>
              <p className="auth-subtitle">
                Enter your email and we'll send you a reset link
              </p>
            </>
          )}
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            <Input
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
            />
            <Button type="submit" fullWidth loading={loading} size="lg">
              Send Reset Link
            </Button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link">
            <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            {' '}Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
