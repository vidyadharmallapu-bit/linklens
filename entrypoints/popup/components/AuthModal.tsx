import { useState } from 'react';
import { Icon } from './Icon';
import {
  isSupabaseConfigured,
  sendPasswordResetEmail,
  signInUser,
  signUpUser,
} from '../services/supabase';
import type { AuthUser } from '../types';

type AuthModalProps = {
  currentUser: AuthUser | null;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  onSignOut: () => void;
};

type AuthTab = 'login' | 'signup' | 'reset';

export function AuthModal({
  currentUser,
  onClose,
  onAuthSuccess,
  onSignOut,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!configured) {
      setErrorMsg('Supabase credentials are not configured in your .env file.');
      return;
    }

    if (!email.trim() || (!password.trim() && tab !== 'reset')) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        const { user, error } = await signInUser(email.trim(), password);
        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onAuthSuccess(user);
          onClose();
        }
      } else if (tab === 'signup') {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const { user, error } = await signUpUser(email.trim(), password);
        if (error) {
          setErrorMsg(error);
        } else if (user) {
          setSuccessMsg('Account created successfully! Check email for verification if required.');
          onAuthSuccess(user);
          setTimeout(() => onClose(), 1200);
        }
      } else if (tab === 'reset') {
        const { success, error } = await sendPasswordResetEmail(email.trim());
        if (error) {
          setErrorMsg(error);
        } else if (success) {
          setSuccessMsg('Password reset link sent to your email.');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="popover-card auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="popover-header">
          <div className="user-avatar">
            <Icon name="user" size={18} />
          </div>
          <div className="user-info">
            <strong id="auth-modal-title" className="user-name">
              {currentUser ? 'Your Account' : 'LinkLens Cloud'}
            </strong>
            <span className="user-tier">
              {currentUser ? currentUser.email : 'Supabase Authentication'}
            </span>
          </div>
          <button
            type="button"
            className="popover-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="popover-body">
          {currentUser ? (
            /* Logged In View */
            <div className="auth-profile-view">
              <div className="auth-status-box">
                <span className="status-indicator-dot" />
                <span className="auth-status-text">Connected to Supabase Cloud</span>
              </div>

              <div className="auth-details-list">
                <div className="meta-row">
                  <span className="meta-key">User ID</span>
                  <span className="meta-val" title={currentUser.id}>
                    {currentUser.id.slice(0, 12)}...
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Cloud Sync</span>
                  <span className="meta-val meta-val-active">
                    <Icon name="check" size={12} /> Active
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="danger-button auth-signout-btn"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            /* Log In / Sign Up Form */
            <div className="auth-form-view">
              {!configured && (
                <div className="auth-notice-card" role="alert">
                  <Icon name="info" size={14} />
                  <div>
                    <strong>Local Offline Mode</strong>
                    <p>
                      To enable cloud sharing, set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Selector */}
              <div className="auth-tab-bar" role="tablist">
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'login' ? 'is-active' : ''}`}
                  onClick={() => {
                    setTab('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  role="tab"
                  aria-selected={tab === 'login'}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'signup' ? 'is-active' : ''}`}
                  onClick={() => {
                    setTab('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  role="tab"
                  aria-selected={tab === 'signup'}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'reset' ? 'is-active' : ''}`}
                  onClick={() => {
                    setTab('reset');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  role="tab"
                  aria-selected={tab === 'reset'}
                >
                  Reset
                </button>
              </div>

              {errorMsg && (
                <div className="auth-feedback-msg error" role="alert">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="auth-feedback-msg success" role="status">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="auth-email" className="auth-label">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    className="auth-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || !configured}
                  />
                </div>

                {tab !== 'reset' && (
                  <div className="auth-field">
                    <label htmlFor="auth-pass" className="auth-label">Password</label>
                    <input
                      id="auth-pass"
                      type="password"
                      required
                      minLength={6}
                      className="auth-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || !configured}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button auth-submit-btn"
                  disabled={loading || !configured}
                >
                  {loading ? (
                    <>
                      <span className="spinner-icon" />
                      <span>Processing...</span>
                    </>
                  ) : tab === 'login' ? (
                    'Log In'
                  ) : tab === 'signup' ? (
                    'Create Account'
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
