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
});
