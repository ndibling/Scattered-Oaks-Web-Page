import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('GET /api/content', () => {
  it('returns all 40 seeded site text fields keyed by field name', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/content'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    expect(Object.keys(body)).toHaveLength(40);
    expect(body['hero.headline']).toBe('Small Farm, Big Personalities.');
    expect(body['contact.label_submit']).toBe('Send Message');
  });
});
