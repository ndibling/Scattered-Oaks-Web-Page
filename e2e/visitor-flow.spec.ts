import { test, expect } from '@playwright/test';

// Visitor flow subset (Development-Plan.md M4): browse, apply each filter
// tab, open the detail lightbox including the photo/video carousel.

test('browse animals, apply each filter tab, open detail lightbox + carousel', async ({ page }) => {
  await page.goto('/');

  // Wait past the client-fetch loading skeleton (SDD.md §3.4 amendment).
  await expect(page.getByRole('heading', { name: 'Available Miniature Zebu' })).toBeVisible();

  // Default filter is "For Sale".
  await expect(page.getByRole('button', { name: 'View details for Daisy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View details for Bug' })).not.toBeVisible();

  const tabs: Array<{ label: string; expectVisible: string; expectHidden: string }> = [
    { label: 'Pending', expectVisible: 'Uma', expectHidden: 'Daisy' },
    { label: 'Coming Soon', expectVisible: 'Samson', expectHidden: 'Uma' },
    { label: 'Not For Sale', expectVisible: 'Bug', expectHidden: 'Samson' },
    { label: 'View All', expectVisible: 'Daisy', expectHidden: '' },
  ];

  for (const tab of tabs) {
    await page.getByRole('tab', { name: tab.label }).click();
    await expect(
      page.getByRole('button', { name: `View details for ${tab.expectVisible}` }),
    ).toBeVisible();
    if (tab.expectHidden) {
      await expect(
        page.getByRole('button', { name: `View details for ${tab.expectHidden}` }),
      ).not.toBeVisible();
    }
  }

  // "View All" is active — Samson (3 photos + 1 video) is visible. Open its detail modal.
  await page.getByRole('button', { name: 'View details for Samson' }).dblclick();
  const dialog = page.getByRole('dialog', { name: 'Samson details' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('1 / 3')).toBeVisible();

  // Carousel: step through all 3 media items via the Next button.
  await dialog.getByRole('button', { name: 'Next photo' }).click();
  await expect(dialog.getByText('2 / 3')).toBeVisible();
  await dialog.getByRole('button', { name: 'Next photo' }).click();
  await expect(dialog.getByText('3 / 3')).toBeVisible();
  await expect(dialog.locator('video')).toBeVisible();

  // Prev button navigates back.
  await dialog.getByRole('button', { name: 'Previous photo' }).click();
  await expect(dialog.getByText('2 / 3')).toBeVisible();

  // Escape closes the modal.
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
