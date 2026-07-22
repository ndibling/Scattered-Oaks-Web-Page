// [ADDED] 2026-07-22 (M6, SDD §4.3). Admin animal CRUD/reorder/media.
// Field names match the animals table's own columns 1:1 (snake_case),
// same convention as the public GET /api/animals response shape — this API
// passes rows straight through rather than camelCasing them.
import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requireSession, auditLog } from '../middleware';
import { VALID_STATUSES } from '../lib/animalConstants';
import {
  uploadToR2,
  deleteFromR2,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  extensionFor,
} from '../lib/r2';

type AnimalRow = {
  id: string;
  name: string;
  registered_name: string | null;
  type: string;
  sex: string;
  age_text: string | null;
  status: string;
  price_cents: number | null;
  description: string | null;
  imza_number: string | null;
  expected_height: string | null;
  sire_registered_name: string | null;
  dam_registered_name: string | null;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type MediaRow = {
  id: string;
  animal_id: string;
  media_type: string;
  url: string;
  display_order: number;
};

type AnimalBody = {
  name?: string;
  registered_name?: string | null;
  type?: string;
  sex?: string;
  age_text?: string | null;
  status?: string;
  price_cents?: number | null;
  description?: string | null;
  imza_number?: string | null;
  expected_height?: string | null;
  sire_registered_name?: string | null;
  dam_registered_name?: string | null;
  display_order?: number;
};

function validateAnimalBody(body: AnimalBody): string | null {
  if (!body.name?.trim()) return 'name is required.';
  if (!body.type?.trim()) return 'type is required.';
  if (!body.sex?.trim()) return 'sex is required.';
  if (!body.status || !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  return null;
}

export const adminAnimals = new Hono<HonoEnv>();
adminAnimals.use('*', requireSession);

// POST /api/admin/animals
adminAnimals.post('/', auditLog('animal.create', 'animal'), async (c) => {
  const body = await c.req.json<AnimalBody>();
  const error = validateAnimalBody(body);
  if (error) return c.json({ error }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO animals (id, name, registered_name, type, sex, age_text, status, price_cents,
       description, imza_number, expected_height, sire_registered_name, dam_registered_name, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.name,
      body.registered_name ?? null,
      body.type,
      body.sex,
      body.age_text ?? null,
      body.status,
      body.price_cents ?? null,
      body.description ?? null,
      body.imza_number ?? null,
      body.expected_height ?? null,
      body.sire_registered_name ?? null,
      body.dam_registered_name ?? null,
      body.display_order ?? 0,
    )
    .run();

  const animal = await c.env.DB.prepare('SELECT * FROM animals WHERE id = ?')
    .bind(id)
    .first<AnimalRow>();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Created animal "${body.name}"`);
  return c.json(animal, 201);
});

// PUT /api/admin/animals/reorder — body: { order: string[] } (animal ids in
// new order). Registered before PUT /:id so "reorder" isn't captured as an id.
adminAnimals.put('/reorder', auditLog('animal.reorder', 'animal'), async (c) => {
  const body = await c.req.json<{ order?: string[] }>();
  if (!Array.isArray(body.order) || body.order.length === 0) {
    return c.json({ error: 'order must be a non-empty array of animal ids.' }, 400);
  }

  await c.env.DB.batch(
    body.order.map((id, index) =>
      c.env.DB.prepare('UPDATE animals SET display_order = ? WHERE id = ?').bind(index * 10, id),
    ),
  );

  c.set('auditSummary', `Reordered ${body.order.length} animals`);
  return c.json({ success: true });
});

adminAnimals.put('/:id', auditLog('animal.update', 'animal'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<AnimalBody>();
  const error = validateAnimalBody(body);
  if (error) return c.json({ error }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT id FROM animals WHERE id = ? AND deleted_at IS NULL',
  )
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Animal not found' }, 404);

  await c.env.DB.prepare(
    `UPDATE animals SET name = ?, registered_name = ?, type = ?, sex = ?, age_text = ?, status = ?,
       price_cents = ?, description = ?, imza_number = ?, expected_height = ?,
       sire_registered_name = ?, dam_registered_name = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(
      body.name,
      body.registered_name ?? null,
      body.type,
      body.sex,
      body.age_text ?? null,
      body.status,
      body.price_cents ?? null,
      body.description ?? null,
      body.imza_number ?? null,
      body.expected_height ?? null,
      body.sire_registered_name ?? null,
      body.dam_registered_name ?? null,
      body.display_order ?? 0,
      id,
    )
    .run();

  const animal = await c.env.DB.prepare('SELECT * FROM animals WHERE id = ?')
    .bind(id)
    .first<AnimalRow>();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Updated animal "${body.name}"`);
  return c.json(animal);
});

// DELETE /api/admin/animals/:id — soft delete (Requirements §7.2.2).
adminAnimals.delete('/:id', auditLog('animal.delete', 'animal'), async (c) => {
  const id = c.req.param('id');
  const animal = await c.env.DB.prepare(
    'SELECT name FROM animals WHERE id = ? AND deleted_at IS NULL',
  )
    .bind(id)
    .first<{ name: string }>();
  if (!animal) return c.json({ error: 'Animal not found' }, 404);

  await c.env.DB.prepare('UPDATE animals SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(id)
    .run();

  c.set('auditTargetId', id);
  c.set('auditSummary', `Deleted animal "${animal.name}"`);
  return c.json({ success: true });
});

// POST /api/admin/animals/:id/media — multipart/form-data: file, media_type
adminAnimals.post('/:id/media', auditLog('animal.media.add', 'animal_media'), async (c) => {
  const animalId = c.req.param('id');
  const animal = await c.env.DB.prepare(
    'SELECT id FROM animals WHERE id = ? AND deleted_at IS NULL',
  )
    .bind(animalId)
    .first();
  if (!animal) return c.json({ error: 'Animal not found' }, 404);

  const form = await c.req.formData();
  const file = form.get('file');
  const mediaType = form.get('media_type');
  if (!(file instanceof File) || (mediaType !== 'image' && mediaType !== 'video')) {
    return c.json({ error: 'file and media_type ("image" or "video") are required.' }, 400);
  }
  const maxBytes = mediaType === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return c.json({ error: `File exceeds the ${maxBytes / (1024 * 1024)}MB limit.` }, 400);
  }
  const displayOrderRaw = form.get('display_order');
  const displayOrder = typeof displayOrderRaw === 'string' ? Number(displayOrderRaw) : 0;

  const id = crypto.randomUUID();
  const key = `animals/${animalId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const url = await uploadToR2(c.env.MEDIA, key, file);

  await c.env.DB.prepare(
    'INSERT INTO animal_media (id, animal_id, media_type, url, display_order) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, animalId, mediaType, url, displayOrder)
    .run();

  const media = await c.env.DB.prepare('SELECT * FROM animal_media WHERE id = ?')
    .bind(id)
    .first<MediaRow>();

  c.set('auditTargetId', animalId);
  c.set('auditSummary', `Added ${mediaType} to animal ${animalId}`);
  return c.json(media, 201);
});

// DELETE /api/admin/animals/:id/media/:mediaId
adminAnimals.delete(
  '/:id/media/:mediaId',
  auditLog('animal.media.delete', 'animal_media'),
  async (c) => {
    const { id: animalId, mediaId } = c.req.param();
    const media = await c.env.DB.prepare(
      'SELECT url FROM animal_media WHERE id = ? AND animal_id = ?',
    )
      .bind(mediaId, animalId)
      .first<{ url: string }>();
    if (!media) return c.json({ error: 'Media not found' }, 404);

    await deleteFromR2(c.env.MEDIA, media.url);
    await c.env.DB.prepare('DELETE FROM animal_media WHERE id = ?').bind(mediaId).run();

    c.set('auditTargetId', animalId);
    c.set('auditSummary', `Removed media from animal ${animalId}`);
    return c.json({ success: true });
  },
);
