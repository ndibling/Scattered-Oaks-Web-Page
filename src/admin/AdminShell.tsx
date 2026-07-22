import { useState, useEffect, useCallback } from 'preact/hooks';
import { api } from '../lib/api';
import type { AuthedAdmin } from '../lib/types';
import AdminLogin from './AdminLogin';
import AdminForcePasswordChange from './AdminForcePasswordChange';
import AnimalEditor from './AnimalEditor';
import ContentEditor from './ContentEditor';
import GalleryEditor from './GalleryEditor';
import SiteSettingsPanel from './SiteSettingsPanel';
import AdminUserManager from './AdminUserManager';
import AuditLogView from './AuditLogView';

type AdminView = 'dashboard' | 'animals' | 'content' | 'gallery' | 'settings' | 'users' | 'audit';

const NAV_ITEMS: { key: AdminView; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'animals', label: 'Animals' },
  { key: 'content', label: 'Site Text & Photos' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'settings', label: 'Settings' },
  { key: 'users', label: 'Administrators' },
  { key: 'audit', label: 'Activity Log' },
];

// [ADDED] 2026-07-22 (M6). One hydrated island managing every authenticated
// admin view as internal state — matches PublicSite.tsx's single-island
// pattern (SDD §3.4) rather than introducing a router dependency. The one
// exception, /admin/reset-password, is its own real page (see
// src/pages/admin/reset-password.astro) since it's reached via an emailed
// link, not in-app navigation.
export default function AdminShell() {
  const [checked, setChecked] = useState(false);
  const [admin, setAdmin] = useState<AuthedAdmin | null>(null);
  const [view, setView] = useState<AdminView>('dashboard');

  const checkAuth = useCallback(() => {
    api
      .me()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!checked) {
    return (
      <div class="admin-shell-loading" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onLoggedIn={checkAuth} />;
  }

  if (admin.forcePasswordChange) {
    return <AdminForcePasswordChange onChanged={checkAuth} />;
  }

  async function handleLogout() {
    await api.logout();
    setAdmin(null);
  }

  return (
    <div class="admin-shell">
      <nav class="admin-shell-nav" aria-label="Admin">
        <div class="admin-shell-brand">Scattered Oaks Admin</div>
        <ul class="admin-shell-nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                class={`admin-shell-nav-btn${view === item.key ? ' admin-shell-nav-btn-active' : ''}`}
                onClick={() => setView(item.key)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div class="admin-shell-nav-footer">
          <div class="admin-shell-whoami">
            {admin.username} <span class="admin-shell-role">({admin.role})</span>
          </div>
          <button type="button" class="admin-shell-logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </nav>
      <main class="admin-shell-main">
        {view === 'dashboard' && (
          <div class="admin-shell-dashboard">
            <h1>Welcome, {admin.username}.</h1>
            <p>Use the navigation to manage animals, site content, the gallery, and more.</p>
          </div>
        )}
        {view === 'animals' && <AnimalEditor />}
        {view === 'content' && <ContentEditor />}
        {view === 'gallery' && <GalleryEditor />}
        {view === 'settings' && <SiteSettingsPanel />}
        {view === 'users' && <AdminUserManager currentAdmin={admin} />}
        {view === 'audit' && <AuditLogView />}
      </main>

      <style>{`
        .admin-shell-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          color: var(--color-text-muted);
        }
        .admin-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 240px 1fr;
          background: var(--color-background);
        }
        .admin-shell-nav {
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
        }
        .admin-shell-brand {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 16px;
          color: var(--color-heading);
          margin-bottom: 20px;
          padding: 0 8px;
        }
        .admin-shell-nav-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .admin-shell-nav-btn {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          border-radius: var(--radius-input);
          padding: 10px 12px;
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--color-text-body);
          cursor: pointer;
        }
        .admin-shell-nav-btn:hover {
          background: var(--color-surface-alt);
        }
        .admin-shell-nav-btn-active {
          background: var(--color-accent);
          color: var(--color-surface);
          font-weight: 600;
        }
        .admin-shell-nav-footer {
          border-top: 1px solid var(--color-border);
          padding-top: 14px;
          margin-top: 14px;
        }
        .admin-shell-whoami {
          font-size: 13px;
          color: var(--color-text-muted);
          padding: 0 8px 10px;
        }
        .admin-shell-role {
          text-transform: capitalize;
        }
        .admin-shell-logout-btn {
          width: 100%;
          background: var(--color-surface-alt);
          border: none;
          border-radius: var(--radius-input);
          padding: 10px 12px;
          font-size: 14px;
          cursor: pointer;
        }
        .admin-shell-main {
          padding: 32px 40px;
          overflow-x: auto;
        }
        .admin-shell-dashboard h1 {
          font-family: var(--font-heading);
          color: var(--color-heading);
        }
      `}</style>
    </div>
  );
}
