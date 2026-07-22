// [ADDED] 2026-07-22 (M6, SDD §4.3). Partial update — only provided keys
// are written, matching the public GET /api/settings response shape.
import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requireSession, auditLog } from '../middleware';

type SettingsBody = {
  showPublicPrices?: boolean;
  galleryStyle?: string;
};

const VALID_GALLERY_STYLES = ['grid', 'mosaic'];

export const adminSettings = new Hono<HonoEnv>();
adminSettings.use('*', requireSession);

// PUT /api/admin/settings
adminSettings.put('/', auditLog('settings.update', 'site_settings'), async (c) => {
  const body = await c.req.json<SettingsBody>();

  if (body.galleryStyle !== undefined && !VALID_GALLERY_STYLES.includes(body.galleryStyle)) {
    return c.json(
      { error: `galleryStyle must be one of: ${VALID_GALLERY_STYLES.join(', ')}` },
      400,
    );
  }

  const changed: string[] = [];
  if (body.showPublicPrices !== undefined) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
      .bind('showPublicPrices', String(body.showPublicPrices))
      .run();
    changed.push('showPublicPrices');
  }
  if (body.galleryStyle !== undefined) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
      .bind('galleryStyle', body.galleryStyle)
      .run();
    changed.push('galleryStyle');
  }

  const { results } = await c.env.DB.prepare('SELECT key, value FROM site_settings').all<{
    key: string;
    value: string;
  }>();
  const byKey: Record<string, string> = {};
  for (const row of results) byKey[row.key] = row.value;

  c.set(
    'auditSummary',
    changed.length ? `Updated settings: ${changed.join(', ')}` : 'No settings changed',
  );
  return c.json({
    showPublicPrices: byKey.showPublicPrices === 'true',
    galleryStyle: byKey.galleryStyle ?? 'grid',
  });
});
