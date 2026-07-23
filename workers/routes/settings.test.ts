import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('GET /api/settings', () => {
  it('returns showPublicPrices as a real boolean and galleryStyle as-is', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/settings'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { showPublicPrices: boolean; galleryStyle: string };
    expect(body).toEqual({ showPublicPrices: true, galleryStyle: 'grid' });
  });

  it('falls back to galleryStyle "grid" when no row is set', async () => {
    await env.DB.prepare("DELETE FROM site_settings WHERE key = 'galleryStyle'").run();
    try {
      const res = await worker.fetch(new Request('http://example.com/api/settings'), env);
      const body = (await res.json()) as { galleryStyle: string };
      expect(body.galleryStyle).toBe('grid');
    } finally {
      await env.DB.prepare(
        "INSERT INTO site_settings (key, value) VALUES ('galleryStyle', 'grid')",
      ).run();
    }
  });
});
