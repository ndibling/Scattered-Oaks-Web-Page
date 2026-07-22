import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { HonoEnv } from './types';
import { hashToken } from './lib/tokens';
import { SESSION_COOKIE_NAME } from './lib/authConstants';

/**
 * Middleware skeleton (SDD §4, Development-Plan.md M3). auditLog is still a
 * no-op — M6 wires it up for state-changing admin requests. requireSession
 * is now real (M5): validates the session cookie, rejects with 401 if
 * missing/expired/invalid, and attaches the admin to the Hono context via
 * c.set('admin', ...) for downstream handlers (c.get('admin')).
 *
 * There's no generic rateLimit middleware here — login's throttling is the
 * account lockout counter (already required data), and forgot-password's
 * throttling reuses the existing password_reset_tokens table as a per-account
 * cooldown (see authConstants.ts). Both are simpler and more precise than a
 * separate IP-based limiter would be without a KV/Durable Object binding.
 */

type SessionRow = {
  admin_id: string;
  expires_at: string;
  username: string;
  role: 'root' | 'admin';
};

export const requireSession: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const tokenHash = await hashToken(token);
  const session = await c.env.DB.prepare(
    `SELECT sessions.admin_id, sessions.expires_at, admins.username, admins.role
     FROM sessions JOIN admins ON admins.id = sessions.admin_id
     WHERE sessions.token = ?`,
  )
    .bind(tokenHash)
    .first<SessionRow>();

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  c.set('admin', { id: session.admin_id, username: session.username, role: session.role });
  await next();
};

/** M6: record actor/action/target/summary in audit_log for state-changing admin requests. */
export const auditLog: MiddlewareHandler<HonoEnv> = async (_c, next) => {
  await next();
};
