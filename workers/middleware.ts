import type { MiddlewareHandler } from 'hono';
import type { Env } from './types';

/**
 * Middleware skeleton (SDD §4, Development-Plan.md M3) — none of these are
 * wired into any route yet, since M3 only implements the public GET endpoints
 * that explicitly require none of them. They exist now so M5 (auth, rate
 * limiting) and M6 (audit logging) extend this file rather than invent a
 * second middleware layer.
 */

/** M5: validate the session cookie, reject with 401 if missing/expired/invalid. */
export const requireSession: MiddlewareHandler<{ Bindings: Env }> = async (_c, next) => {
  await next();
};

/** M5: throttle POST /api/auth/login and /api/auth/forgot-password by IP/account. */
export const rateLimit: MiddlewareHandler<{ Bindings: Env }> = async (_c, next) => {
  await next();
};

/** M6: record actor/action/target/summary in audit_log for state-changing admin requests. */
export const auditLog: MiddlewareHandler<{ Bindings: Env }> = async (_c, next) => {
  await next();
};
