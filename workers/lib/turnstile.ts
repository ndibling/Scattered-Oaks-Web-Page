// [ADDED] 2026-07-22 (M7, SDD §6.4). Server-side verification of the public
// contact form's Cloudflare Turnstile token, against Cloudflare's own
// siteverify endpoint — no local mocking needed for tests: Cloudflare
// publishes stable, permanent test sitekey/secret-key pairs designed
// specifically for this (see workers/routes/contact.test.ts).
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteverifyResponse = {
  success: boolean;
};

export async function verifyTurnstileToken(secretKey: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    if (!res.ok) return false;
    const body = await res.json<SiteverifyResponse>();
    return body.success === true;
  } catch {
    // Network failure against Cloudflare's own endpoint — fail closed
    // rather than let a spam submission through because siteverify was
    // unreachable.
    return false;
  }
}
