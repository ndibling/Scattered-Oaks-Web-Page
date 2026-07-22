import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { HonoEnv } from './types';
import { hashToken } from './lib/tokens';
import { SESSION_COOKIE_NAME } from './lib/authConstants';

/**
 * Middleware (SDD §4, Development-Plan.md M3/M6). requireSession (M5):
 * validates the session cookie, rejects with 401 if missing/expired/invalid,
 * and attaches the admin to the Hono context via c.set('admin', ...) for
 * downstream handlers (c.get('admin')). auditLog (M6): see below.
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

/**
 * Records actor/action/target/summary in audit_log for state-changing admin
 * requests (Requirements §7.2.4). A middleware factory rather than a single
 * export because the action/targetType are static per-route, but the
 * target id/summary are only known once the handler runs (e.g. a freshly
 * generated animal id) — handlers set them via c.set('auditTargetId', ...)
 * and c.set('auditSummary', ...) right before returning. Only fires on 2xx:
 * a request the handler rejected (400/404/etc.) didn't actually change
 * anything, so there's nothing to hold an admin accountable for.
 *
 * Usage: adminAnimals.post('/', auditLog('animal.create', 'animal'), handler)
 */
export function auditLog(action: string, targetType: string): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    await next();
    if (c.res.status >= 200 && c.res.status < 300) {
      const admin = c.get('admin');
      await c.env.DB.prepare(
        `INSERT INTO audit_log (id, admin_id, action, target_type, target_id, summary)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          admin.id,
          action,
          targetType,
          c.get('auditTargetId') ?? null,
          c.get('auditSummary') ?? null,
        )
        .run();
    }
  };
}
