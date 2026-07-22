// [ADDED] 2026-07-22 (M6, approved scope addition — gallery_photos existed
// with a public GET /api/gallery but no admin management anywhere in the
// original SDD). Mirrors adminAnimals.ts's media-management shape: add/
// delete only, no file-replace endpoint — updating a photo's image is
// delete-then-recreate, same asymmetry animal_media already has.
import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requireSession, auditLog } from '../middleware';
import { uploadToR2, deleteFromR2, MAX_IMAGE_BYTES, extensionFor } from '../lib/r2';

type GalleryPhotoRow = {
  id: string;
  url: string;
  label: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export const adminGallery = new Hono<HonoEnv>();
adminGallery.use('*', requireSession);

// POST /api/admin/gallery — multipart/form-data: file, label, description?
adminGallery.post('/', auditLog('gallery.create', 'gallery_photo'), async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const label = form.get('label');
  if (!(file instanceof File) || typeof label !== 'string' || !label.trim()) {
    return c.json({ error: 'file and label are required.' }, 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return c.json({ error: `File exceeds the ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit.` }, 400);
  }
  const description = form.get('description');
  const displayOrderRaw = form.get('display_order');
  const displayOrder = typeof displayOrderRaw === 'string' ? Number(displayOrderRaw) : 0;

  const id = crypto.randomUUID();
  const key = `gallery/${crypto.randomUUID()}.${extensionFor(file)}`;
  const url = await uploadToR2(c.env.MEDIA, key, file);

  await c.env.DB.prepare(
    'INSERT INTO gallery_photos (id, url, label, description, display_order) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, url, label.trim(), typeof description === 'string' ? description : null, displayOrder)
    .run();

  const photo = await c.env.DB.prepare('SELECT * FROM gallery_photos WHERE id = ?')
    .bind(id)
    .first<GalleryPhotoRow>();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Added gallery photo "${label.trim()}"`);
  return c.json(photo, 201);
});

// PUT /api/admin/gallery/reorder — body: { order: string[] }. Registered
// before PUT /:id so "reorder" isn't captured as an id.
adminGallery.put('/reorder', auditLog('gallery.reorder', 'gallery_photo'), async (c) => {
  const body = await c.req.json<{ order?: string[] }>();
  if (!Array.isArray(body.order) || body.order.length === 0) {
    return c.json({ error: 'order must be a non-empty array of gallery photo ids.' }, 400);
  }

  await c.env.DB.batch(
    body.order.map((id, index) =>
      c.env.DB.prepare('UPDATE gallery_photos SET display_order = ? WHERE id = ?').bind(
        index * 10,
        id,
      ),
    ),
  );

  c.set('auditSummary', `Reordered ${body.order.length} gallery photos`);
  return c.json({ success: true });
});

// PUT /api/admin/gallery/:id — metadata only (label/description/display_order), no file replace.
adminGallery.put('/:id', auditLog('gallery.update', 'gallery_photo'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    label?: string;
    description?: string | null;
    display_order?: number;
  }>();
  if (!body.label?.trim()) return c.json({ error: 'label is required.' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM gallery_photos WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Gallery photo not found' }, 404);

  await c.env.DB.prepare(
    `UPDATE gallery_photos SET label = ?, description = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  )
    .bind(body.label.trim(), body.description ?? null, body.display_order ?? 0, id)
    .run();

  const photo = await c.env.DB.prepare('SELECT * FROM gallery_photos WHERE id = ?')
    .bind(id)
    .first<GalleryPhotoRow>();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Updated gallery photo "${body.label.trim()}"`);
  return c.json(photo);
});

// DELETE /api/admin/gallery/:id
adminGallery.delete('/:id', auditLog('gallery.delete', 'gallery_photo'), async (c) => {
  const id = c.req.param('id');
  const photo = await c.env.DB.prepare('SELECT url, label FROM gallery_photos WHERE id = ?')
    .bind(id)
    .first<{ url: string; label: string }>();
  if (!photo) return c.json({ error: 'Gallery photo not found' }, 404);

  await deleteFromR2(c.env.MEDIA, photo.url);
  await c.env.DB.prepare('DELETE FROM gallery_photos WHERE id = ?').bind(id).run();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Deleted gallery photo "${photo.label}"`);
  return c.json({ success: true });
});
