import { describe, it, expect } from 'vitest';
import { TURNSTILE_SITE_KEY } from './turnstile';

describe('TURNSTILE_SITE_KEY', () => {
  it("falls back to Cloudflare's published always-pass test sitekey when unset", () => {
    // PUBLIC_TURNSTILE_SITE_KEY isn't set in this test environment, so the
    // fallback branch is what's actually exercised here (and in local
    // dev/E2E) — the "real site key" branch only runs in a production
    // build with that env var set, verified by build/deploy instead.
    expect(TURNSTILE_SITE_KEY).toBe('1x00000000000000000000AA');
  });
});
