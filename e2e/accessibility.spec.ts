import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 AA automated scan (Development-Plan.md M8, Requirements.md
// §8.3). Filters to impact: 'critical' specifically, matching M8's exit
// criteria wording ("no critical axe-core violations") rather than
// requiring zero of every severity. axe-core doesn't deep-scan the
// Turnstile cross-origin iframe by default — it reports that as
// "incomplete", not a violation, so it doesn't affect this assertion.

const ROOT_USERNAME = 'Root';
const ROOT_PASSWORD = 'DevRoot!2026';

function criticalViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter((v) => v.impact === 'critical');
}

test('public site has no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Available Miniature Zebu' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = criticalViolations(results);
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
});

test('admin login screen has no critical accessibility violations', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Scattered Oaks Admin' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = criticalViolations(results);
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
});

test('admin dashboard (authenticated) has no critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.getByLabel('Username').fill(ROOT_USERNAME);
  await page.getByLabel('Password').fill(ROOT_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Root.' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = criticalViolations(results);
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);

  await page.getByRole('button', { name: 'Log Out' }).click();
});
