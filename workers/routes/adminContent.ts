// [ADDED] 2026-07-22 (M6, SDD §4.3). Site text/image field editing
// (Requirements §7.2.1). Keys are fixed/seeded, not freely creatable — a
// PUT for an unknown key 404s instead of silently inserting an orphan row,
// which would otherwise let a typo'd key look like it "saved" with no
// public page ever reading it back.
import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requireSession, auditLog } from '../middleware';
import { uploadToR2, deleteFromR2, MAX_IMAGE_BYTES, extensionFor } from '../lib/r2';

// Keys backed by an uploaded file rather than free text — see
// seeds/sample-data.sql's [ADDED] 2026-07-22 note and Hero.tsx/Header.tsx/
// About.tsx, which read these instead of a hardcoded /uploads/... path.
const IMAGE_CONTENT_KEYS = new Set(['site.logo_url', 'hero.photo_url', 'about.photo_url']);

export const adminContent = new Hono<HonoEnv>();
adminContent.use('*', requireSession);

// PUT /api/admin/content/:key
adminContent.put('/:key', auditLog('content.update', 'site_content'), async (c) => {
  const key = c.req.param('key');
  const existing = await c.env.DB.prepare('SELECT value_text FROM site_content WHERE key = ?')
    .bind(key)
    .first<{ value_text: string }>();
  if (!existing) return c.json({ error: `Unknown content key: ${key}` }, 404);

  const admin = c.get('admin');
  const contentType = c.req.header('content-type') ?? '';

  let value: string;
  if (contentType.includes('multipart/form-data')) {
    if (!IMAGE_CONTENT_KEYS.has(key)) {
      return c.json({ error: `${key} is a text field and does not accept a file upload.` }, 400);
    }
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return c.json({ error: 'file is required.' }, 400);
    if (file.size > MAX_IMAGE_BYTES) {
      return c.json({ error: `File exceeds the ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit.` }, 400);
    }
    const uploadKey = `content/${key}-${crypto.randomUUID()}.${extensionFor(file)}`;
    value = await uploadToR2(c.env.MEDIA, uploadKey, file);
    await deleteFromR2(c.env.MEDIA, existing.value_text);
  } else {
    const body = await c.req.json<{ value?: string }>();
    if (typeof body.value !== 'string') return c.json({ error: 'value is required.' }, 400);
    value = body.value;
  }

  await c.env.DB.prepare(
    `UPDATE site_content SET value_text = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE key = ?`,
  )
    .bind(value, admin.id, key)
    .run();

  c.set('auditTargetId', key);
  c.set('auditSummary', `Updated content "${key}"`);
  return c.json({ key, value });
});
