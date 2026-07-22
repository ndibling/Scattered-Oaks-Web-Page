import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type { AdminUser, AuthedAdmin } from '../lib/types';

type Props = {
  currentAdmin: AuthedAdmin;
};

const BLANK_NEW = { username: '', email: '', role: 'admin' as 'admin' | 'root' };

export default function AdminUserManager({ currentAdmin }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState(BLANK_NEW);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'root'>('admin');
  const [editNewPassword, setEditNewPassword] = useState('');

  function refresh() {
    setLoading(true);
    api
      .listAdminUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(e: Event) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createAdminUser(newUser);
      setNewUser(BLANK_NEW);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create administrator.');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditNewPassword('');
  }

  async function saveEdit(user: AdminUser) {
    setError(null);
    try {
      const body: { email?: string; role?: string; newPassword?: string } = {
        email: editEmail,
        role: editRole,
      };
      if (editNewPassword) body.newPassword = editNewPassword;
      await api.updateAdminUser(user.id, body);
      setEditingId(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update administrator.');
    }
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Delete administrator "${user.username}"?`)) return;
    try {
      await api.deleteAdminUser(user.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete administrator.');
    }
  }

  return (
    <div class="admin-user-manager">
      <h1 class="admin-user-manager-heading">Administrators</h1>
      {error && <div class="admin-user-manager-error">{error}</div>}

      <form class="admin-user-manager-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Username"
          required
          value={newUser.username}
          onInput={(e) =>
            setNewUser({ ...newUser, username: (e.target as HTMLInputElement).value })
          }
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={newUser.email}
          onInput={(e) => setNewUser({ ...newUser, email: (e.target as HTMLInputElement).value })}
        />
        {currentAdmin.role === 'root' && (
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({
                ...newUser,
                role: (e.target as HTMLSelectElement).value as 'admin' | 'root',
              })
            }
          >
            <option value="admin">admin</option>
            <option value="root">root</option>
          </select>
        )}
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Add Administrator'}
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table class="admin-user-manager-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                {editingId === user.id ? (
                  <td colSpan={4}>
                    <div class="admin-user-manager-edit-row">
                      <input
                        type="email"
                        value={editEmail}
                        onInput={(e) => setEditEmail((e.target as HTMLInputElement).value)}
                      />
                      {currentAdmin.role === 'root' && (
                        <select
                          value={editRole}
                          onChange={(e) =>
                            setEditRole((e.target as HTMLSelectElement).value as 'admin' | 'root')
                          }
                        >
                          <option value="admin">admin</option>
                          <option value="root">root</option>
                        </select>
                      )}
                      {currentAdmin.role === 'root' && (
                        <input
                          type="password"
                          placeholder="Force-set new password (optional)"
                          value={editNewPassword}
                          onInput={(e) => setEditNewPassword((e.target as HTMLInputElement).value)}
                        />
                      )}
                      <button type="button" onClick={() => saveEdit(user)}>
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td class="admin-user-manager-actions-cell">
                      <button type="button" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      {user.role !== 'root' && (
                        <button
                          type="button"
                          class="admin-user-manager-delete-btn"
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style>{`
        .admin-user-manager-heading {
          font-family: var(--font-heading);
          color: var(--color-heading);
        }
        .admin-user-manager-error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-radius: var(--radius-input);
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .admin-user-manager-create-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          background: var(--color-surface);
          padding: 16px;
          border-radius: var(--radius-card);
          margin-bottom: 20px;
        }
        .admin-user-manager-create-form input,
        .admin-user-manager-create-form select {
          padding: 8px 10px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 14px;
        }
        .admin-user-manager-create-form button {
          background: var(--color-accent);
          color: var(--color-surface);
          border: none;
          border-radius: var(--radius-pill);
          padding: 8px 18px;
          cursor: pointer;
        }
        .admin-user-manager-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--color-surface);
          border-radius: var(--radius-card);
        }
        .admin-user-manager-table th,
        .admin-user-manager-table td {
          text-align: left;
          padding: 10px 14px;
          border-bottom: 1px solid var(--color-border);
          font-size: 14px;
        }
        .admin-user-manager-actions-cell button {
          background: var(--color-surface-alt);
          border: none;
          border-radius: var(--radius-input);
          padding: 6px 10px;
          margin-right: 6px;
          cursor: pointer;
        }
        .admin-user-manager-delete-btn {
          color: var(--color-danger);
        }
        .admin-user-manager-edit-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .admin-user-manager-edit-row input,
        .admin-user-manager-edit-row select {
          padding: 8px 10px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
        }
        .admin-user-manager-edit-row button {
          background: var(--color-surface-alt);
          border: none;
          border-radius: var(--radius-input);
          padding: 8px 12px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
