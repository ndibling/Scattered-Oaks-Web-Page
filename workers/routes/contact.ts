// [ADDED] 2026-07-22 (M7, SDD §4.1, §6.4). Public contact-form submission —
// verifies the Turnstile token server-side before doing anything else
// (Requirements §9.5), then emails the owner via Resend, including the
// selected animal's name if one was chosen.
import { Hono } from 'hono';
import type { Env } from '../types';
import { verifyTurnstileToken } from '../lib/turnstile';
import { sendEmail } from '../lib/email';

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
  animalId?: string;
  turnstileToken?: string;
};

export const contact = new Hono<{ Bindings: Env }>();

contact.post('/', async (c) => {
  const body = await c.req.json<ContactBody>();
  const { name, email, message, animalId, turnstileToken } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim() || !turnstileToken) {
    return c.json({ error: 'name, email, message, and a completed spam-check are required.' }, 400);
  }

  const verified = await verifyTurnstileToken(c.env.TURNSTILE_SECRET_KEY, turnstileToken);
  if (!verified) {
    return c.json({ error: 'Spam check failed. Please try again.' }, 400);
  }

  let animalName: string | null = null;
  if (animalId) {
    const row = await c.env.DB.prepare(
      'SELECT name FROM animals WHERE id = ? AND deleted_at IS NULL',
    )
      .bind(animalId)
      .first<{ name: string }>();
    animalName = row?.name ?? null;
  }

  await sendEmail(c.env.RESEND_API_KEY, {
    to: c.env.OWNER_CONTACT_EMAIL,
    subject: animalName ? `Inquiry about ${animalName}` : 'New contact form inquiry',
    html: `<p><strong>From:</strong> ${name} (${email})</p>${
      animalName ? `<p><strong>Interested in:</strong> ${animalName}</p>` : ''
    }<p>${message}</p>`,
  });

  return c.json({ success: true });
});
