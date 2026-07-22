import { useState } from 'preact/hooks';
import { api } from '../lib/api';

type Props = {
  onChanged: () => void;
};

// Blocking view shown when the logged-in admin's force_password_change flag
// is set (new account or a Root-forced reset) — Requirements §7.2.4.
export default function AdminForcePasswordChange({ onChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="force-change-shell">
      <form class="force-change-form" onSubmit={handleSubmit}>
        <h1 class="force-change-heading">Set a New Password</h1>
        <p class="force-change-body">
          For security, you need to set a new password before continuing.
        </p>
        {error && <div class="force-change-error">{error}</div>}
        <div class="force-change-field">
          <label for="force-change-current">Temporary Password</label>
          <input
            id="force-change-current"
            type="password"
            required
            value={currentPassword}
            onInput={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="force-change-field">
          <label for="force-change-new">New Password</label>
          <input
            id="force-change-new"
            type="password"
            required
            value={newPassword}
            onInput={(e) => setNewPassword((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="force-change-field">
          <label for="force-change-confirm">Confirm New Password</label>
          <input
            id="force-change-confirm"
            type="password"
            required
            value={confirmPassword}
            onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
          />
        </div>
        <button type="submit" class="force-change-submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Set Password'}
        </button>
      </form>

      <style>{`
        .force-change-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          padding: 24px;
        }
        .force-change-form {
          width: 100%;
          max-width: 380px;
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          box-shadow: var(--shadow-card);
          padding: 34px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .force-change-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 20px;
          color: var(--color-heading);
          margin: 0;
          text-align: center;
        }
        .force-change-body {
          font-size: 14px;
          color: var(--color-text-muted);
          text-align: center;
          margin: 0;
        }
        .force-change-error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-radius: var(--radius-input);
          padding: 10px 12px;
          font-size: 14px;
        }
        .force-change-field label {
          display: block;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 6px;
          color: var(--color-heading);
        }
        .force-change-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 15px;
          font-family: var(--font-body);
        }
        .force-change-submit {
          margin-top: 6px;
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
        .force-change-submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
