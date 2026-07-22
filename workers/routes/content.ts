import { Hono } from 'hono';
import type { Env } from '../types';

type SiteContentRow = {
  key: string;
  value_text: string;
};

export const content = new Hono<{ Bindings: Env }>();

// GET /api/content — all editable site text, keyed by field.
content.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT key, value_text FROM site_content',
  ).all<SiteContentRow>();
  const byKey: Record<string, string> = {};
  for (const row of results) {
    byKey[row.key] = row.value_text;
  }
  return c.json(byKey);
});
