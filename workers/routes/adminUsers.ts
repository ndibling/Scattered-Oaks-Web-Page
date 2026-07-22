// [ADDED] 2026-07-22 (M6, SDD §4.3, Requirements §7.2.3). Administrator
// account management. Two Root-only guards beyond the base session check
// (first use of HTTP 403 in this codebase):
//  - Only an actor who is already Root can create/edit an account into the
//    `root` role — Requirements §7.2.3's literal text allows any admin to
//    manage other admins with no stated restriction on the role they can
//    assign, which read literally would let any admin mint a second Root
//    account. Confirmed with the user and documented as [ADDED] in
//    Requirements.md §7.2.3/§15.
//  - Only Root can directly force-set another admin's password
//    (Requirements §7.2.4, "as a last resort").
// "Root cannot be deleted" is enforced by checking the *target* row, not
// the actor — any admin attempting it gets the same 403.
import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requireSession, auditLog } from '../middleware';
import { hashPassword, generateTempPassword, validatePasswordPolicy } from '../lib/password';

type AdminRow = {
  id: string;
  username: string;
  email: string;
  role: 'root' | 'admin';
  force_password_change: number;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  last_login_at: string | null;
};

const ADMIN_LIST_COLUMNS = `id, username, email, role, force_password_change, failed_login_count, locked_until, created_at, last_login_at`;

export const adminUsers = new Hono<HonoEnv>();
adminUsers.use('*', requireSession);

// GET /api/admin/users
adminUsers.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${ADMIN_LIST_COLUMNS} FROM admins ORDER BY created_at`,
  ).all<AdminRow>();
  return c.json(results);
});

// POST /api/admin/users
adminUsers.post('/', auditLog('user.create', 'admin'), async (c) => {
  const actor = c.get('admin');
  const body = await c.req.json<{ username?: string; email?: string; role?: string }>();
  const username = body.username?.trim();
  const email = body.email?.trim();
  const role = body.role;

  if (!username || !email || (role !== 'root' && role !== 'admin')) {
    return c.json({ error: 'username, email, and role ("root" or "admin") are required.' }, 400);
  }
  if (role === 'root' && actor.role !== 'root') {
    return c.json({ error: 'Only Root can create another Root account.' }, 403);
  }

  const usernameTaken = await c.env.DB.prepare('SELECT id FROM admins WHERE username = ?')
    .bind(username)
    .first();
  if (usernameTaken) return c.json({ error: 'That username is already in use.' }, 400);
  const emailTaken = await c.env.DB.prepare('SELECT id FROM admins WHERE email = ?')
    .bind(email)
    .first();
  if (emailTaken) return c.json({ error: 'That email is already in use.' }, 400);

  const tempPassword = generateTempPassword();
  const { hash, salt } = await hashPassword(tempPassword);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO admins (id, username, email, password_hash, password_salt, role, force_password_change)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  )
    .bind(id, username, email, hash, salt, role)
    .run();
  // TODO(M7): email `tempPassword` to `email` via Resend. Never returned by
  // this endpoint — leaking a credential via API response, even in dev, is
  // the same class of mistake auth.ts's forgot-password already avoids.

  const admin = await c.env.DB.prepare(`SELECT ${ADMIN_LIST_COLUMNS} FROM admins WHERE id = ?`)
    .bind(id)
    .first<AdminRow>();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Created admin "${username}" (${role})`);
  return c.json(admin, 201);
});

// PUT /api/admin/users/:id
adminUsers.put('/:id', auditLog('user.update', 'admin'), async (c) => {
  const actor = c.get('admin');
  const id = c.req.param('id');
  const body = await c.req.json<{ email?: string; role?: string; newPassword?: string }>();

  const target = await c.env.DB.prepare('SELECT id, role FROM admins WHERE id = ?')
    .bind(id)
    .first<{ id: string; role: 'root' | 'admin' }>();
  if (!target) return c.json({ error: 'Administrator not found' }, 404);

  if (body.role !== undefined && body.role !== 'root' && body.role !== 'admin') {
    return c.json({ error: 'role must be "root" or "admin".' }, 400);
  }
  if (body.role === 'root' && actor.role !== 'root') {
    return c.json({ error: 'Only Root can grant the Root role.' }, 403);
  }
  if (body.newPassword !== undefined && actor.role !== 'root') {
    return c.json({ error: "Only Root can set another administrator's password directly." }, 403);
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (body.email !== undefined) {
    sets.push('email = ?');
    values.push(body.email.trim());
  }
  if (body.role !== undefined) {
    sets.push('role = ?');
    values.push(body.role);
  }
  if (body.newPassword !== undefined) {
    const policyError = validatePasswordPolicy(body.newPassword);
    if (policyError) return c.json({ error: policyError }, 400);
    const { hash, salt } = await hashPassword(body.newPassword);
    sets.push('password_hash = ?', 'password_salt = ?', 'force_password_change = 1');
    values.push(hash, salt);
  }

  if (sets.length > 0) {
    values.push(id);
    await c.env.DB.prepare(`UPDATE admins SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
    if (body.newPassword !== undefined) {
      // A forced password reset invalidates every existing session for that account.
      await c.env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(id).run();
    }
  }

  const admin = await c.env.DB.prepare(`SELECT ${ADMIN_LIST_COLUMNS} FROM admins WHERE id = ?`)
    .bind(id)
    .first<AdminRow>();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Updated admin ${id}`);
  return c.json(admin);
});

// DELETE /api/admin/users/:id — Root cannot be deleted (Requirements §7.2.3).
adminUsers.delete('/:id', auditLog('user.delete', 'admin'), async (c) => {
  const id = c.req.param('id');
  const target = await c.env.DB.prepare('SELECT username, role FROM admins WHERE id = ?')
    .bind(id)
    .first<{ username: string; role: 'root' | 'admin' }>();
  if (!target) return c.json({ error: 'Administrator not found' }, 404);
  if (target.role === 'root') {
    return c.json({ error: 'The Root account cannot be deleted.' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Deleted admin "${target.username}"`);
  return c.json({ success: true });
});
