import { describe, it, expect } from 'vitest';
import { verifyTurnstileToken } from './turnstile';

// Cloudflare's published, permanent test secret keys — the siteverify
// endpoint returns a deterministic success/failure for these regardless of
// the token value, specifically so this can be tested without a real
// browser-rendered widget. Hits the real endpoint; no mocking involved.
const ALWAYS_PASS_SECRET = '1x0000000000000000000000000000000AA';
const ALWAYS_FAIL_SECRET = '2x0000000000000000000000000000000AA';

describe('verifyTurnstileToken', () => {
  it('returns true for the always-pass test secret key', async () => {
    const result = await verifyTurnstileToken(ALWAYS_PASS_SECRET, 'any-token-value');
    expect(result).toBe(true);
  });

  it('returns false for the always-fail test secret key', async () => {
    const result = await verifyTurnstileToken(ALWAYS_FAIL_SECRET, 'any-token-value');
    expect(result).toBe(false);
  });

  it('returns false for a malformed secret key', async () => {
    const result = await verifyTurnstileToken('not-a-real-secret', 'any-token-value');
    expect(result).toBe(false);
  });
});
