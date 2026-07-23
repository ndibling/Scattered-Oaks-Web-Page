import { describe, it, expect, vi, afterEach } from 'vitest';
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

// [ADDED] 2026-07-23 (M9 follow-up) — regression test for a real production
// bug: a GitHub Actions repo Variable that's unset substitutes as an empty
// string at build time, not undefined, which `?? fallback` didn't catch
// (only `||` does). Caught live via Turnstile throwing
// `Invalid input for parameter "sitekey", got ""` on every page load.
describe('TURNSTILE_SITE_KEY with PUBLIC_TURNSTILE_SITE_KEY explicitly empty', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('still falls back to the test sitekey instead of using the empty string', async () => {
    vi.stubEnv('PUBLIC_TURNSTILE_SITE_KEY', '');
    const { TURNSTILE_SITE_KEY: reloaded } = await import('./turnstile');
    expect(reloaded).toBe('1x00000000000000000000AA');
  });
});
