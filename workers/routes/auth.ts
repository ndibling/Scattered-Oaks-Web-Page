// Auth endpoints (SDD.md §6.2 login/session, §6.3 password reset,
// Requirements.md §7.2.4 lockout/forced-change). login/forgot-password
// deliberately return generic responses regardless of whether the
// username/account exists, to avoid leaking which accounts are real.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { HonoEnv } from '../types';
import { requireSession } from '../middleware';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  DUMMY_HASH_SALT,
} from '../lib/password';
import { generateRandomToken, hashToken } from '../lib/tokens';
import {
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS,
  SESSION_DURATION_MS,
  RESET_TOKEN_DURATION_MS,
  FORGOT_PASSWORD_COOLDOWN_MS,
  SESSION_COOKIE_NAME,
} from '../lib/authConstants';

type AdminRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: 'root' | 'admin';
  force_password_change: number;
  failed_login_count: number;
  locked_until: string | null;
};

const GENERIC_LOGIN_ERROR = 'Invalid username or password.';
const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  message: 'If that account exists, a password reset email has been sent.',
};

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export const auth = new Hono<HonoEnv>();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>();
  const username = body.username?.trim();
  const password = body.password;
  if (!username || !password) {
    return c.json({ error: GENERIC_LOGIN_ERROR }, 401);
  }

  const admin = await c.env.DB.prepare('SELECT * FROM admins WHERE username = ?')
    .bind(username)
    .first<AdminRow>();

  if (!admin) {
    // Run a real (slow) derivation against a dummy hash so an unknown
    // username takes the same time as a real one — avoids a timing
    // side-channel that would let an attacker enumerate valid usernames.
    await verifyPassword(password, DUMMY_HASH_SALT.hash, DUMMY_HASH_SALT.salt);
    return c.json({ error: GENERIC_LOGIN_ERROR }, 401);
  }

  if (admin.locked_until && new Date(admin.locked_until).getTime() > Date.now()) {
    return c.json(
      {
        error: 'This account is temporarily locked due to failed login attempts. Try again later.',
      },
      423,
    );
  }

  const valid = await verifyPassword(password, admin.password_hash, admin.password_salt);
  if (!valid) {
    const failedCount = admin.failed_login_count + 1;
    if (failedCount >= LOCKOUT_THRESHOLD) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      await c.env.DB.prepare(
        'UPDATE admins SET failed_login_count = ?, locked_until = ? WHERE id = ?',
      )
        .bind(failedCount, lockedUntil, admin.id)
        .run();
      return c.json(
        {
          error:
            'This account is temporarily locked due to failed login attempts. Try again later.',
        },
        423,
      );
    }
    await c.env.DB.prepare('UPDATE admins SET failed_login_count = ? WHERE id = ?')
      .bind(failedCount, admin.id)
      .run();
    return c.json({ error: GENERIC_LOGIN_ERROR }, 401);
  }

  await c.env.DB.prepare(
    `UPDATE admins SET failed_login_count = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(admin.id)
    .run();

  const token = generateRandomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, admin.id, expiresAt)
    .run();

  setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_DURATION_MS / 1000));

  return c.json({
    success: true,
    forcePasswordChange: Boolean(admin.force_password_change),
  });
});

// POST /api/auth/logout
auth.post('/logout', requireSession, async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);

  if (token) {
    const tokenHash = await hashToken(token);
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(tokenHash).run();
  }

  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.json({ success: true });
});

// POST /api/auth/forgot-password
auth.post('/forgot-password', async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim();
  if (!email) {
    return c.json(GENERIC_FORGOT_PASSWORD_RESPONSE);
  }

  const admin = await c.env.DB.prepare('SELECT id FROM admins WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();

  if (admin) {
    // password_reset_tokens has no created_at column, so "created within the
    // cooldown window" is inferred from expires_at: every token is created
    // with expires_at = createdAt + RESET_TOKEN_DURATION_MS, so a token whose
    // expires_at is still further out than (now + RESET_TOKEN_DURATION_MS -
    // FORGOT_PASSWORD_COOLDOWN_MS) must have been created within the last
    // FORGOT_PASSWORD_COOLDOWN_MS.
    const recentCreationThreshold = new Date(
      Date.now() + RESET_TOKEN_DURATION_MS - FORGOT_PASSWORD_COOLDOWN_MS,
    ).toISOString();
    const recent = await c.env.DB.prepare(
      `SELECT token FROM password_reset_tokens
       WHERE admin_id = ? AND used_at IS NULL AND expires_at > ?`,
    )
      .bind(admin.id, recentCreationThreshold)
      .first();

    // A second request within the cooldown window is a silent no-op — at
    // most one reset email goes out per account per FORGOT_PASSWORD_COOLDOWN_MS,
    // reusing password_reset_tokens instead of a separate rate limiter.
    if (!recent) {
      const token = generateRandomToken();
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_tokens (token, admin_id, expires_at) VALUES (?, ?, ?)',
      )
        .bind(tokenHash, admin.id, expiresAt)
        .run();
      // TODO(M7): send the reset link (containing `token`) via Resend.
    }
  }

  return c.json(GENERIC_FORGOT_PASSWORD_RESPONSE);
});

// POST /api/auth/reset-password
auth.post('/reset-password', async (c) => {
  const body = await c.req.json<{ token?: string; newPassword?: string }>();
  const token = body.token;
  const newPassword = body.newPassword;
  if (!token || !newPassword) {
    return c.json({ error: 'Invalid or expired reset link.' }, 400);
  }

  const tokenHash = await hashToken(token);
  const resetRow = await c.env.DB.prepare(
    `SELECT admin_id, expires_at, used_at FROM password_reset_tokens WHERE token = ?`,
  )
    .bind(tokenHash)
    .first<{ admin_id: string; expires_at: string; used_at: string | null }>();

  if (!resetRow || resetRow.used_at || new Date(resetRow.expires_at).getTime() < Date.now()) {
    return c.json({ error: 'Invalid or expired reset link.' }, 400);
  }

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    return c.json({ error: policyError }, 400);
  }

  const { hash, salt } = await hashPassword(newPassword);
  await c.env.DB.prepare(
    `UPDATE admins SET password_hash = ?, password_salt = ?, force_password_change = 0,
     failed_login_count = 0, locked_until = NULL WHERE id = ?`,
  )
    .bind(hash, salt, resetRow.admin_id)
    .run();
  await c.env.DB.prepare(
    'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = ?',
  )
    .bind(tokenHash)
    .run();
  // A reset makes any stolen session token for this account useless too.
  await c.env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(resetRow.admin_id).run();

  return c.json({ success: true });
});

// POST /api/auth/change-password
auth.post('/change-password', requireSession, async (c) => {
  const admin = c.get('admin');
  const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current and new password are both required.' }, 400);
  }

  const row = await c.env.DB.prepare('SELECT password_hash, password_salt FROM admins WHERE id = ?')
    .bind(admin.id)
    .first<{ password_hash: string; password_salt: string }>();
  if (!row || !(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
    return c.json({ error: 'Current password is incorrect.' }, 401);
  }

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    return c.json({ error: policyError }, 400);
  }

  const { hash, salt } = await hashPassword(newPassword);
  await c.env.DB.prepare(
    'UPDATE admins SET password_hash = ?, password_salt = ?, force_password_change = 0 WHERE id = ?',
  )
    .bind(hash, salt, admin.id)
    .run();

  // Keep the current session alive but invalidate every other one — a
  // password change should log out other devices/sessions, not this one.
  const currentToken = getCookie(c, SESSION_COOKIE_NAME);
  const currentTokenHash = currentToken ? await hashToken(currentToken) : null;
  if (currentTokenHash) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE admin_id = ? AND token != ?')
      .bind(admin.id, currentTokenHash)
      .run();
  } else {
    await c.env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(admin.id).run();
  }

  return c.json({ success: true });
});
