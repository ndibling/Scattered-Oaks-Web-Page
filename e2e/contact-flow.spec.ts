import { test, expect } from '@playwright/test';

// Contact form flow (Development-Plan.md M7): fill the form (with and
// without selecting an animal), submit, confirm the thank-you panel
// appears. Works headless because the default Turnstile sitekey
// (src/lib/turnstile.ts's fallback, 1x00000000000000000000AA — Cloudflare's
// published "always passes" test key) renders a real widget that
// auto-resolves against the real Cloudflare endpoint with no user
// interaction required — confirmed via manual browser QA before writing
// this spec. Cannot assert the email was actually delivered (no
// email-capture tooling here) — that's a manual/Resend-dashboard check
// against real credentials, per Development-Plan's own exit-criteria wording.

test('submits a general inquiry and shows the thank-you panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Say Howdy to Heather' })).toBeVisible();

  await page.getByLabel('Name').fill('Playwright QA');
  await page.getByLabel('Email').fill('qa@example.com');
  await page.getByLabel('Message').fill('This is an automated test of the contact form.');

  // Turnstile's dummy widget auto-resolves; give it a moment to render and
  // complete before submitting.
  await expect(page.locator('.contact-turnstile')).toBeVisible();
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: /Send Message/ }).click();
  await expect(page.getByRole('heading', { name: 'Thanks, partner!' })).toBeVisible();
});

test('submits an inquiry about a specific animal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Available Miniature Zebu' })).toBeVisible();

  await page.getByLabel('Interested In').selectOption('Daisy');
  await page.getByLabel('Name').fill('Playwright QA');
  await page.getByLabel('Email').fill('qa@example.com');
  await page.getByLabel('Message').fill('Is Daisy still available?');

  await expect(page.locator('.contact-turnstile')).toBeVisible();
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: /Send Message/ }).click();
  await expect(page.getByRole('heading', { name: 'Thanks, partner!' })).toBeVisible();
});
