import { test, expect } from '@playwright/test';

// Requirements.md §8.2: "Target: first contentful paint under 2 seconds on
// a typical broadband/mobile connection." Local `wrangler dev` has no CDN,
// edge caching, or asset minification, so it isn't representative of the
// production experience §8.2 actually describes — this is a generous
// regression tripwire (catches a newly-added render-blocking resource
// tanking FCP), not a literal stand-in for the 2s target. The real number
// is logged for manual comparison; true 2-second confirmation happens
// against a real preview deployment once M9 exists.

test('first contentful paint is logged and stays under a generous local ceiling', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Available Miniature Zebu' })).toBeVisible();

  const fcp = await page.evaluate(() => {
    const entry = performance
      .getEntriesByType('paint')
      .find((e) => e.name === 'first-contentful-paint');
    return entry?.startTime ?? null;
  });

  expect(fcp).not.toBeNull();
  console.log(
    `[performance] first-contentful-paint: ${fcp}ms (local wrangler dev, informational — compare against the real 2000ms §8.2 target on a preview deployment)`,
  );
  expect(fcp).toBeLessThan(5000);
});
