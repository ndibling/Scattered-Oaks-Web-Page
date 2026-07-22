// Concrete values SDD.md §6.2/§6.3 described the *behavior* of but didn't pin
// down a number for — decided during M5 implementation, see SDD.md change log.

/** Requirements.md §7.2.4: lockout after 3 consecutive failed attempts. */
export const LOCKOUT_THRESHOLD = 3;

/** How long an account stays locked once locked_until is set. */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/** Session cookie / sessions row lifetime. */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Password reset link validity window. */
export const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Forgot-password rate limiting (Development-Plan.md M5, Requirements §8.1):
 * rather than a separate IP-based limiter (no KV/Durable Object binding
 * exists yet, and per-IP limiting is better handled by a Cloudflare Rate
 * Limiting Rule at the edge than reinvented in Worker code), this reuses the
 * existing password_reset_tokens table — a second request for the same
 * account within this window is a silent no-op (still returns the same
 * generic response), so at most one reset email goes out per account per
 * window regardless of how many times it's requested.
 */
export const FORGOT_PASSWORD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export const SESSION_COOKIE_NAME = 'session';
