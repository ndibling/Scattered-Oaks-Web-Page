import { Hono } from 'hono';
import type { Env } from '../types';

type GalleryPhotoRow = {
  id: string;
  url: string;
  label: string;
  description: string | null;
  display_order: number;
};

export const gallery = new Hono<{ Bindings: Env }>();

// GET /api/gallery
gallery.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, url, label, description, display_order FROM gallery_photos ORDER BY display_order',
  ).all<GalleryPhotoRow>();
  return c.json(results);
});
