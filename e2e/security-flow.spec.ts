import { test, expect } from '@playwright/test';
import { d1Exec } from './helpers/d1';
import { hashPassword } from '../workers/lib/password';
import { generateRandomToken, hashToken } from '../workers/lib/tokens';

// Full security flow (Development-Plan.md M8) driven through the actual
// browser UI, not just the API — workers/routes/auth.test.ts already covers
// all three scenarios thoroughly at the API level. Each test uses its own
// uniquely-suffixed throwaway admin rather than the shared seeded Root
// account: admin-flow.spec.ts also logs in as Root, and playwright.config.ts
// has fullyParallel: true, so mutating Root's lockout/password state here
// would be a real race, not a hypothetical one. Disjoint rows also mean no
// test.describe.serial is needed.
//
// hashPassword/generateRandomToken/hashToken are imported directly from the
// real production modules (both use only standard WebCrypto, no
// Cloudflare-specific API) rather than reimplemented, so a hash/token
// mismatch here can never silently diverge from what the app actually does.

test('locks out after 3 failed attempts, still rejects the correct password while locked', async ({
  page,
}) => {
  const username = `security-lockout-${Date.now()}`;
  const { hash, salt } = await hashPassword('LockoutTest1!');
  d1Exec(
    `INSERT INTO admins (id, username, email, password_hash, password_salt, role) VALUES ('${username}', '${username}', '${username}@example.com', '${hash}', '${salt}', 'admin')`,
  );
  try {
    await page.goto('/admin');
    for (let i = 0; i < 3; i++) {
      await page.getByLabel('Username').fill(username);
      await page.getByLabel('Password').fill('wrong-password');
      await page.getByRole('button', { name: 'Sign In' }).click();
    }
    await expect(page.locator('.admin-login-error')).toHaveText(
      'This account is temporarily locked due to failed login attempts. Try again later.',
    );

    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('LockoutTest1!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.admin-login-error')).toHaveText(
      'This account is temporarily locked due to failed login attempts. Try again later.',
    );
  } finally {
    d1Exec(`DELETE FROM sessions WHERE admin_id = '${username}'`);
    d1Exec(`DELETE FROM admins WHERE id = '${username}'`);
  }
});

test('resets a password via an emailed link and can log in with the new one', async ({ page }) => {
  const username = `security-reset-${Date.now()}`;
  const { hash, salt } = await hashPassword('OldPassword1!');
  d1Exec(
    `INSERT INTO admins (id, username, email, password_hash, password_salt, role) VALUES ('${username}', '${username}', '${username}@example.com', '${hash}', '${salt}', 'admin')`,
  );
  try {
    const rawToken = generateRandomToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    d1Exec(
      `INSERT INTO password_reset_tokens (token, admin_id, expires_at) VALUES ('${tokenHash}', '${username}', '${expiresAt}')`,
    );

    await page.goto(`/admin/reset-password?token=${rawToken}`);
    await page.getByLabel('New Password', { exact: true }).fill('BrandNewPassword1!');
    await page.getByLabel('Confirm New Password').fill('BrandNewPassword1!');
    await page.getByRole('button', { name: 'Set Password' }).click();
    await expect(page.getByRole('heading', { name: 'Password updated.' })).toBeVisible();

    await page.goto('/admin');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('BrandNewPassword1!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: `Welcome, ${username}.` })).toBeVisible();
    await page.getByRole('button', { name: 'Log Out' }).click();
  } finally {
    d1Exec(`DELETE FROM sessions WHERE admin_id = '${username}'`);
    d1Exec(`DELETE FROM admins WHERE id = '${username}'`);
  }
});

test('forces a password change on first login for a new admin', async ({ page }) => {
  const username = `security-forced-${Date.now()}`;
  const { hash, salt } = await hashPassword('TempPassword1!');
  d1Exec(
    `INSERT INTO admins (id, username, email, password_hash, password_salt, role, force_password_change) VALUES ('${username}', '${username}', '${username}@example.com', '${hash}', '${salt}', 'admin', 1)`,
  );
  try {
    await page.goto('/admin');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('TempPassword1!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'Set a New Password' })).toBeVisible();
    await page.getByLabel('Temporary Password').fill('TempPassword1!');
    await page.getByLabel('New Password', { exact: true }).fill('PermanentPassword1!');
    await page.getByLabel('Confirm New Password').fill('PermanentPassword1!');
    await page.getByRole('button', { name: 'Set Password' }).click();

    await expect(page.getByRole('heading', { name: `Welcome, ${username}.` })).toBeVisible();
    await page.getByRole('button', { name: 'Log Out' }).click();
  } finally {
    d1Exec(`DELETE FROM sessions WHERE admin_id = '${username}'`);
    d1Exec(`DELETE FROM admins WHERE id = '${username}'`);
  }
});
