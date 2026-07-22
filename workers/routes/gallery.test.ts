import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('GET /api/gallery', () => {
  it('returns all 9 seeded gallery photos with captions, ordered by display_order', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/gallery'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      label: string;
      description: string;
      display_order: number;
    }[];
    expect(body).toHaveLength(9);
    expect(body[0].id).toBe('mamma-needing-help');
    expect(body[0].description).toContain('calving check');
    expect(body.map((p) => p.display_order)).toEqual(
      [...body.map((p) => p.display_order)].sort((a, b) => a - b),
    );
  });
});
