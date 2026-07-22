import { Hono } from 'hono';
import type { Env } from '../types';

const VALID_STATUSES = ['for-sale', 'pending', 'coming-soon', 'not-for-sale'] as const;

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

export const animals = new Hono<{ Bindings: Env }>();

// GET /api/animals?status=
animals.get('/', async (c) => {
  const status = c.req.query('status');
  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return c.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, 400);
  }

  const query = status
    ? c.env.DB.prepare(
        'SELECT * FROM animals WHERE deleted_at IS NULL AND status = ? ORDER BY display_order',
      ).bind(status)
    : c.env.DB.prepare('SELECT * FROM animals WHERE deleted_at IS NULL ORDER BY display_order');

  const { results } = await query.all<AnimalRow>();
  return c.json(results);
});

// GET /api/animals/:id
animals.get('/:id', async (c) => {
  const id = c.req.param('id');

  const animal = await c.env.DB.prepare('SELECT * FROM animals WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first<AnimalRow>();

  if (!animal) {
    return c.json({ error: 'Animal not found' }, 404);
  }

  const { results: media } = await c.env.DB.prepare(
    'SELECT * FROM animal_media WHERE animal_id = ? ORDER BY display_order',
  )
    .bind(id)
    .all<MediaRow>();

  return c.json({ ...animal, media });
});
