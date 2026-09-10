import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
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
      setError('Please enter your email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-centered">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-container animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link to="/" style={{ display: 'inline-flex', marginBottom: '16px' }} aria-label="Skill X Home">
            <Logo size="md" />
          </Link>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div className="auth-icon-badge auth-icon-badge-success" style={{ margin: '0 auto 18px auto' }}>
              <CheckCircle2 size={28} />
            </div>
            <h1 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
              Check your inbox
            </h1>
            <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
              We've sent password reset instructions to <strong>{email}</strong>. Please follow the link in the email.
            </p>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setSent(false); setError(''); }}
              style={{ marginBottom: '16px' }}
            >
              Didn't get the email? Try again
            </Button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="auth-icon-badge" style={{ margin: '0 auto 16px auto' }}>
                <KeyRound size={26} />
              </div>
              <h1 className="auth-title" style={{ fontSize: '1.6rem' }}>Reset Password</h1>
              <p className="auth-subtitle">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {error && <div className="auth-error">{error}</div>}

              <Input
                label="Email Address"
                name="email"
                type="email"
                icon={Mail}
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
                required
              />

              <Button type="submit" fullWidth loading={loading} size="lg">
                Send Reset Link
              </Button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
