import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import worker from '../index';

const ROOT_USERNAME = 'Root';
const ROOT_PASSWORD = 'DevRoot!2026';

function sessionCookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('Response had no Set-Cookie header');
  return setCookie.split(';')[0];
}

async function login(): Promise<string> {
  const res = await worker.fetch(
    new Request('http://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: ROOT_USERNAME, password: ROOT_PASSWORD }),
    }),
    env,
  );
  return sessionCookieFrom(res);
}

function req(method: string, path: string, cookie: string, body?: unknown) {
  return worker.fetch(
    new Request(`http://example.com${path}`, {
      method,
      headers: { 'content-type': 'application/json', cookie },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    env,
  );
}

async function createPhoto(cookie: string, label = 'Test Photo') {
  const form = new FormData();
  form.set('file', new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' }));
  form.set('label', label);
  const res = await worker.fetch(
    new Request('http://example.com/api/admin/gallery', {
      method: 'POST',
      headers: { cookie },
      body: form,
    }),
    env,
  );
  return (await res.json()) as { id: string; url: string; label: string };
}

let cookie: string;

beforeAll(async () => {
  cookie = await login();
});

afterAll(async () => {
  await env.DB.prepare(
    'DELETE FROM sessions WHERE admin_id = (SELECT id FROM admins WHERE username = ?)',
  )
    .bind(ROOT_USERNAME)
    .run();
});

describe('admin gallery endpoints require a session', () => {
  it('rejects an unauthenticated create', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' }));
    form.set('label', 'X');
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/gallery', { method: 'POST', body: form }),
      env,
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/gallery', () => {
  it('rejects a request missing label', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' }));
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/gallery', {
        method: 'POST',
        headers: { cookie },
        body: form,
      }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('rejects an image over the 10MB size limit', async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    const form = new FormData();
    form.set('file', new File([oversized], 'huge.jpg', { type: 'image/jpeg' }));
    form.set('label', 'Too Big');
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/gallery', {
        method: 'POST',
        headers: { cookie },
        body: form,
      }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/exceeds the 10MB limit/);
  });

  it('uploads to R2 and creates a gallery_photos row, and audit-logs it', async () => {
    const photo = await createPhoto(cookie, 'Barn Sunset');
    try {
      expect(photo.label).toBe('Barn Sunset');
      expect(photo.url).toMatch(/^\/media\/gallery\//);

      const audit = await env.DB.prepare(
        `SELECT action, target_id FROM audit_log WHERE target_type = 'gallery_photo' ORDER BY created_at DESC, rowid DESC LIMIT 1`,
      ).first<{ action: string; target_id: string }>();
      expect(audit?.action).toBe('gallery.create');
      expect(audit?.target_id).toBe(photo.id);

      const mediaRes = await worker.fetch(new Request(`http://example.com${photo.url}`), env);
      expect(mediaRes.status).toBe(200);
    } finally {
      await env.DB.prepare('DELETE FROM gallery_photos WHERE id = ?').bind(photo.id).run();
    }
  });
});

describe('PUT /api/admin/gallery/:id', () => {
  it('404s for an unknown id', async () => {
    const res = await req('PUT', '/api/admin/gallery/does-not-exist', cookie, { label: 'X' });
    expect(res.status).toBe(404);
  });

  it('updates label/description/display_order without touching the file', async () => {
    const photo = await createPhoto(cookie);
    try {
      const res = await req('PUT', `/api/admin/gallery/${photo.id}`, cookie, {
        label: 'Renamed',
        description: 'A new caption',
        display_order: 5,
      });
      expect(res.status).toBe(200);
      const updated = (await res.json()) as { label: string; url: string };
      expect(updated.label).toBe('Renamed');
      expect(updated.url).toBe(photo.url);
    } finally {
      await env.DB.prepare('DELETE FROM gallery_photos WHERE id = ?').bind(photo.id).run();
    }
  });
});

describe('DELETE /api/admin/gallery/:id', () => {
  it('removes the R2 object and the row', async () => {
    const photo = await createPhoto(cookie);
    const res = await req('DELETE', `/api/admin/gallery/${photo.id}`, cookie);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare('SELECT id FROM gallery_photos WHERE id = ?')
      .bind(photo.id)
      .first();
    expect(row).toBeNull();

    const mediaRes = await worker.fetch(new Request(`http://example.com${photo.url}`), env);
    expect(mediaRes.status).toBe(404);
  });
});

describe('PUT /api/admin/gallery/reorder', () => {
  it('sets display_order to index * 10 for each id in order', async () => {
    const a = await createPhoto(cookie, 'A');
    const b = await createPhoto(cookie, 'B');
    try {
      const res = await req('PUT', '/api/admin/gallery/reorder', cookie, { order: [b.id, a.id] });
      expect(res.status).toBe(200);
      const rows = await env.DB.prepare(
        'SELECT id, display_order FROM gallery_photos WHERE id IN (?, ?)',
      )
        .bind(a.id, b.id)
        .all<{ id: string; display_order: number }>();
      const byId = Object.fromEntries(rows.results.map((r) => [r.id, r.display_order]));
      expect(byId[b.id]).toBe(0);
      expect(byId[a.id]).toBe(10);
    } finally {
      await env.DB.prepare('DELETE FROM gallery_photos WHERE id IN (?, ?)').bind(a.id, b.id).run();
    }
  });

  it('rejects an empty order array', async () => {
    const res = await req('PUT', '/api/admin/gallery/reorder', cookie, { order: [] });
    expect(res.status).toBe(400);
  });
});
