// [ADDED] 2026-07-22 (M7, SDD §6.5, Requirements §9.4). Resend transactional
// email — used for password-reset links, new-admin invites, and contact-form
// inquiries to the owner. Swallows every failure (network error or non-2xx):
// a dropped notification email must never turn a forgot-password/create-admin/
// contact request into a 500. mail.scattered-oaks-zebu.com is the confirmed
// verified sending domain (Manual-Setup-Guide.md Phase G).
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Scattered Oaks Farm <noreply@mail.scattered-oaks-zebu.com>';

export async function sendEmail(
  apiKey: string,
  opts: { to: string; subject: string; html: string },
): Promise<void> {
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}): ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error(`Resend send threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}
