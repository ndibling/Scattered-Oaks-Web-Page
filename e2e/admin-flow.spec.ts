import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Admin flow (Development-Plan.md M6): login -> edit a text field -> replace
// an image -> add/edit/upload-photo/delete an animal -> add/edit/delete a
// gallery photo -> toggle a site setting -> logout. One long test, not
// several, since each step mutates shared local D1 state (unlike the Vitest
// integration suite, there's no per-test storage isolation here).

const dir = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGE = path.join(dir, 'fixtures', 'test-photo.png');
// 3000x2000 — well over src/lib/imageResize.ts's MAX_DIMENSION (2000), so an
// upload of this fixture is a meaningful check that client-side pre-resize
// (M7) actually ran, unlike TEST_IMAGE which is already tiny.
const LARGE_TEST_IMAGE = path.join(dir, 'fixtures', 'large-test-photo.jpg');

const ROOT_USERNAME = 'Root';
const ROOT_PASSWORD = 'DevRoot!2026';

test('admin can log in, edit content, manage an animal, manage the gallery, toggle a setting, and log out', async ({
  page,
}) => {
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/admin');
  await page.getByLabel('Username').fill(ROOT_USERNAME);
  await page.getByLabel('Password').fill(ROOT_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Root.' })).toBeVisible();

  // --- Edit a text field ---
  // Read-then-restore rather than assuming the seed value: this test mutates
  // shared local D1 state with no per-test isolation, so it must be safe to
  // re-run against whatever the field currently holds (including its own
  // prior, possibly-interrupted run) rather than a hardcoded before/after pair.
  await page.getByRole('button', { name: 'Site Text & Photos' }).click();
  const headlineInput = page.locator('[id="content-hero.headline"]');
  await expect(headlineInput).toBeVisible();
  const originalHeadline = await headlineInput.inputValue();
  const testHeadline = `E2E Test Headline ${Date.now()}`;
  await headlineInput.fill(testHeadline);
  const headlineRow = page.locator('.content-editor-row', { has: headlineInput });
  await headlineRow.getByRole('button', { name: 'Save' }).click();
  await expect(headlineRow.getByRole('button', { name: 'Save' })).toBeDisabled();

  // --- Replace an image ---
  const heroPhotoRow = page.locator('.content-editor-row', { hasText: 'hero.photo_url' });
  await heroPhotoRow.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
  await expect(heroPhotoRow.locator('img')).toHaveAttribute('src', /^\/media\/content\//);

  // Verify the edited headline and replaced photo show up on the live public site.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: testHeadline })).toBeVisible();

  // --- Add, upload a photo to, and delete an animal ---
  // Unique per run so a prior interrupted run's leftover row (if any) can't
  // collide with this run's row-lookups.
  const animalName = `E2E Test Zebu ${Date.now()}`;
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Animals' }).click();
  await page.getByRole('button', { name: '+ Add Animal' }).click();
  await page.getByLabel('Name', { exact: true }).fill(animalName);
  await page.getByLabel('Type', { exact: true }).fill('Cow');
  await page.getByLabel('Sex', { exact: true }).fill('Heifer');
  await page.getByRole('button', { name: 'Save Animal' }).click();
  await expect(page.getByRole('heading', { name: 'Animals' })).toBeVisible();

  const newAnimalRow = page.getByRole('row', { name: new RegExp(animalName) });
  await expect(newAnimalRow).toBeVisible();
  await newAnimalRow.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: `Edit ${animalName}` })).toBeVisible();

  await page.locator('.animal-editor-media input[type="file"]').setInputFiles(LARGE_TEST_IMAGE);
  const uploadedImg = page.locator('.animal-editor-media-item img');
  await expect(uploadedImg).toBeVisible();
  // Confirms resizeImageFile (M7) actually ran client-side before upload —
  // the fixture is 3000x2000, well over MAX_DIMENSION.
  await expect
    .poll(() => uploadedImg.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const naturalWidth = await uploadedImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(naturalWidth).toBeLessThanOrEqual(2000);

  await page.getByRole('button', { name: '← Back to list' }).click();
  await page
    .getByRole('row', { name: new RegExp(animalName) })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('row', { name: new RegExp(animalName) })).not.toBeVisible();

  // --- Add, edit, and delete a gallery photo ---
  const photoLabel = `E2E Test Photo ${Date.now()}`;
  const photoLabelRenamed = `${photoLabel} Renamed`;
  await page.getByRole('button', { name: 'Gallery' }).click();
  await page.getByPlaceholder('Photo label').fill(photoLabel);
  await page.locator('.gallery-editor-upload input[type="file"]').setInputFiles(TEST_IMAGE);

  // Anchored on the <img alt> rather than hasText: once "Edit" is clicked,
  // the label moves into an <input value>, which isn't part of textContent,
  // so a hasText filter would stop matching mid-test.
  const galleryItem = page.locator('.gallery-editor-item').filter({
    has: page.locator(`img[alt="${photoLabel}"]`),
  });
  await expect(galleryItem).toBeVisible();
  await galleryItem.getByRole('button', { name: 'Edit' }).click();
  await galleryItem.locator('input').fill(photoLabelRenamed);
  await galleryItem.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.gallery-editor-item', { hasText: photoLabelRenamed })).toBeVisible();
  await page
    .locator('.gallery-editor-item', { hasText: photoLabelRenamed })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(
    page.locator('.gallery-editor-item', { hasText: photoLabelRenamed }),
  ).not.toBeVisible();

  // --- Toggle a site setting, then restore it ---
  await page.getByRole('button', { name: 'Settings' }).click();
  const priceToggle = page.getByRole('switch', { name: 'Show Prices Publicly' });
  const wasChecked = (await priceToggle.getAttribute('aria-checked')) === 'true';
  await priceToggle.click();
  await expect(priceToggle).toHaveAttribute('aria-checked', String(!wasChecked));
  await priceToggle.click();
  await expect(priceToggle).toHaveAttribute('aria-checked', String(wasChecked));

  // Restore the headline to whatever it held before this test ran, so a
  // re-run (and the visitor-flow spec) see a stable value either way.
  await page.getByRole('button', { name: 'Site Text & Photos' }).click();
  const headlineInput2 = page.locator('[id="content-hero.headline"]');
  await expect(headlineInput2).toBeVisible();
  await headlineInput2.fill(originalHeadline);
  await page
    .locator('.content-editor-row', { has: headlineInput2 })
    .getByRole('button', { name: 'Save' })
    .click();
  await expect(
    page.locator('.content-editor-row', { has: headlineInput2 }).getByRole('button', {
      name: 'Save',
    }),
  ).toBeDisabled();

  // --- Log out ---
  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page.getByRole('heading', { name: 'Scattered Oaks Admin' })).toBeVisible();
});
