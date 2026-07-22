import { Hono } from 'hono';
import type { Env } from '../types';

type SiteSettingRow = {
  key: string;
  value: string;
};

export const settings = new Hono<{ Bindings: Env }>();

// GET /api/settings — public settings: showPublicPrices, galleryStyle.
settings.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT key, value FROM site_settings',
  ).all<SiteSettingRow>();
  const byKey: Record<string, string> = {};
  for (const row of results) {
    byKey[row.key] = row.value;
  }

  return c.json({
    showPublicPrices: byKey.showPublicPrices === 'true',
    galleryStyle: byKey.galleryStyle ?? 'grid',
  });
});
