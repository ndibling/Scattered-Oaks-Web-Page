import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('GET /api/animals', () => {
  it('returns all 11 seeded, non-deleted animals ordered by display_order', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/animals'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; primary_image_url: string | null }[];
    expect(body).toHaveLength(11);
    expect(body[0].id).toBe('daisy');
    expect(body[0].primary_image_url).toBe('/uploads/Daisy.jpg');
    expect(body.at(-1)?.id).toBe('peanut');
  });

  it('filters by ?status=', async () => {
    const res = await worker.fetch(
      new Request('http://example.com/api/animals?status=for-sale'),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string }[];
    expect(body.map((a) => a.id).sort()).toEqual(['daisy', 'molly', 'peanut']);
    expect(body.every((a) => a.status === 'for-sale')).toBe(true);
  });

  it('rejects an invalid ?status= value with 400', async () => {
    const res = await worker.fetch(
      new Request('http://example.com/api/animals?status=sold-yesterday'),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('excludes soft-deleted animals', async () => {
    await env.DB.prepare(
      "UPDATE animals SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'daisy'",
    ).run();
    try {
      const res = await worker.fetch(new Request('http://example.com/api/animals'), env);
      const body = (await res.json()) as { id: string }[];
      expect(body.map((a) => a.id)).not.toContain('daisy');
      expect(body).toHaveLength(10);
    } finally {
      await env.DB.prepare("UPDATE animals SET deleted_at = NULL WHERE id = 'daisy'").run();
    }
  });
});

describe('GET /api/animals/:id', () => {
  it('returns full detail including ordered media for a multi-photo animal', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/animals/samson'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      name: string;
      media: { url: string; display_order: number }[];
    };
    expect(body.name).toBe('Samson');
    expect(body.media).toHaveLength(3);
    expect(body.media.map((m) => m.display_order)).toEqual([0, 1, 2]);
    expect(body.media[2].url).toContain('.mp4');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/animals/nope'), env);
    expect(res.status).toBe(404);
  });

  it('returns 404 for a soft-deleted animal', async () => {
    await env.DB.prepare(
      "UPDATE animals SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'daisy'",
    ).run();
    try {
      const res = await worker.fetch(new Request('http://example.com/api/animals/daisy'), env);
      expect(res.status).toBe(404);
    } finally {
      await env.DB.prepare("UPDATE animals SET deleted_at = NULL WHERE id = 'daisy'").run();
    }
  });
});
