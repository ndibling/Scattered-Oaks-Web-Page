import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';

// [ADDED] 2026-07-22 (M6). The one /admin/* view that's a real page rather
// than an AdminShell view — reached via an emailed reset link
// (?token=...), not in-app navigation. Posts to M5's already-working
// POST /api/auth/reset-password.
export default function AdminResetPassword() {
  // Read in an effect, not at render time — this page is prerendered on the
  // server (client:load still SSRs an initial static shell), where `window`
  // doesn't exist.
  const [token, setToken] = useState('');
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('This reset link is missing its token. Request a new one from the login page.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="admin-reset-shell">
      {done ? (
        <div class="admin-reset-done">
          <h1>Password updated.</h1>
          <a href="/admin">Go to login</a>
        </div>
      ) : (
        <form class="admin-reset-form" onSubmit={handleSubmit}>
          <h1 class="admin-reset-heading">Set a New Password</h1>
          {error && <div class="admin-reset-error">{error}</div>}
          <div class="admin-reset-field">
            <label for="admin-reset-new">New Password</label>
            <input
              id="admin-reset-new"
              type="password"
              required
              value={newPassword}
              onInput={(e) => setNewPassword((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="admin-reset-field">
            <label for="admin-reset-confirm">Confirm New Password</label>
            <input
              id="admin-reset-confirm"
              type="password"
              required
              value={confirmPassword}
              onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
            />
          </div>
          <button type="submit" class="admin-reset-submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Set Password'}
          </button>
        </form>
      )}

      <style>{`
        .admin-reset-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          padding: 24px;
        }
        .admin-reset-form,
        .admin-reset-done {
          width: 100%;
          max-width: 380px;
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          box-shadow: var(--shadow-card);
          padding: 34px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        .admin-reset-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 20px;
          color: var(--color-heading);
          margin: 0;
        }
        .admin-reset-error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-radius: var(--radius-input);
          padding: 10px 12px;
          font-size: 14px;
        }
        .admin-reset-field {
          text-align: left;
        }
        .admin-reset-field label {
          display: block;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 6px;
          color: var(--color-heading);
        }
        .admin-reset-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 15px;
        }
        .admin-reset-submit {
          background: var(--color-accent);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 16px;
          padding: 14px 0;
          border: none;
          border-radius: var(--radius-pill);
          cursor: pointer;
        }
        .admin-reset-submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
