import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('GET /media/*', () => {
  it('404s for an unknown key', async () => {
    const res = await worker.fetch(new Request('http://example.com/media/does/not/exist.jpg'), env);
    expect(res.status).toBe(404);
  });

  it('serves an object uploaded directly to the MEDIA bucket with its content-type', async () => {
    await env.MEDIA.put('test/direct.txt', 'hello world', {
      httpMetadata: { contentType: 'text/plain' },
    });
    try {
      const res = await worker.fetch(new Request('http://example.com/media/test/direct.txt'), env);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/plain');
      expect(await res.text()).toBe('hello world');
    } finally {
      await env.MEDIA.delete('test/direct.txt');
    }
  });

  it('is public — no session cookie required', async () => {
    await env.MEDIA.put('test/public.txt', 'x');
    try {
      const res = await worker.fetch(new Request('http://example.com/media/test/public.txt'), env);
      expect(res.status).toBe(200);
    } finally {
      await env.MEDIA.delete('test/public.txt');
    }
  });
});
