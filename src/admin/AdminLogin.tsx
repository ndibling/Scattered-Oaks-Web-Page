import { useState } from 'preact/hooks';
import { api } from '../lib/api';

type Props = {
  onLoggedIn: () => void;
};

export default function AdminLogin({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login(username, password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="admin-login-shell">
      <form class="admin-login-form" onSubmit={handleSubmit}>
        <h1 class="admin-login-heading">Scattered Oaks Admin</h1>
        {error && <div class="admin-login-error">{error}</div>}
        <div class="admin-login-field">
          <label for="admin-login-username">Username</label>
          <input
            id="admin-login-username"
            type="text"
            required
            value={username}
            onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="admin-login-field">
          <label for="admin-login-password">Password</label>
          <input
            id="admin-login-password"
            type="password"
            required
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
        </div>
        <button type="submit" class="admin-login-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <style>{`
        .admin-login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          padding: 24px;
        }
        .admin-login-form {
          width: 100%;
          max-width: 360px;
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          box-shadow: var(--shadow-card);
          padding: 34px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .admin-login-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 22px;
          color: var(--color-heading);
          margin: 0 0 6px;
          text-align: center;
        }
        .admin-login-error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-radius: var(--radius-input);
          padding: 10px 12px;
          font-size: 14px;
        }
        .admin-login-field label {
          display: block;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 6px;
          color: var(--color-heading);
        }
        .admin-login-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 15px;
          font-family: var(--font-body);
        }
        .admin-login-submit {
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
        .admin-login-submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
