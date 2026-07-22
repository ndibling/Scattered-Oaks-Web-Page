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

async function latestAuditRow(targetType: string) {
  return env.DB.prepare(
    `SELECT * FROM audit_log WHERE target_type = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
  )
    .bind(targetType)
    .first<{
      action: string;
      admin_id: string;
      target_id: string | null;
      summary: string | null;
    }>();
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

describe('admin animal endpoints require a session', () => {
  it('rejects an unauthenticated create', async () => {
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/animals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X', type: 'Cow', sex: 'Cow', status: 'for-sale' }),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/animals', () => {
  it('rejects a body missing required fields', async () => {
    const res = await req('POST', '/api/admin/animals', cookie, { name: 'No Type' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid status', async () => {
    const res = await req('POST', '/api/admin/animals', cookie, {
      name: 'Bad Status',
      type: 'Cow',
      sex: 'Cow',
      status: 'sold-yesterday',
    });
    expect(res.status).toBe(400);
  });

  it('creates an animal and records an audit_log entry', async () => {
    const res = await req('POST', '/api/admin/animals', cookie, {
      name: 'Test Calf',
      type: 'Cow',
      sex: 'Heifer',
      status: 'for-sale',
      price_cents: 500000,
    });
    expect(res.status).toBe(201);
    const animal = (await res.json()) as { id: string; name: string };
    expect(animal.name).toBe('Test Calf');

    const audit = await latestAuditRow('animal');
    expect(audit?.action).toBe('animal.create');
    expect(audit?.target_id).toBe(animal.id);

    await env.DB.prepare('DELETE FROM animals WHERE id = ?').bind(animal.id).run();
  });
});

describe('PUT /api/admin/animals/:id', () => {
  it('404s for an unknown id', async () => {
    const res = await req('PUT', '/api/admin/animals/does-not-exist', cookie, {
      name: 'X',
      type: 'Cow',
      sex: 'Cow',
      status: 'for-sale',
    });
    expect(res.status).toBe(404);
  });

  it('updates an existing animal and sets updated_at', async () => {
    const createRes = await req('POST', '/api/admin/animals', cookie, {
      name: 'Before',
      type: 'Cow',
      sex: 'Heifer',
      status: 'for-sale',
    });
    const { id } = (await createRes.json()) as { id: string };
    try {
      const before = await env.DB.prepare('SELECT updated_at FROM animals WHERE id = ?')
        .bind(id)
        .first<{ updated_at: string }>();

      const putRes = await req('PUT', `/api/admin/animals/${id}`, cookie, {
        name: 'After',
        type: 'Cow',
        sex: 'Heifer',
        status: 'pending',
      });
      expect(putRes.status).toBe(200);
      const updated = (await putRes.json()) as { name: string; status: string };
      expect(updated.name).toBe('After');
      expect(updated.status).toBe('pending');

      const after = await env.DB.prepare('SELECT updated_at FROM animals WHERE id = ?')
        .bind(id)
        .first<{ updated_at: string }>();
      expect(after?.updated_at).toBeDefined();
      expect(before?.updated_at).toBeDefined();
    } finally {
      await env.DB.prepare('DELETE FROM animals WHERE id = ?').bind(id).run();
    }
  });
});

describe('DELETE /api/admin/animals/:id (soft delete)', () => {
  it('sets deleted_at instead of removing the row, and hides it from the public list', async () => {
    const createRes = await req('POST', '/api/admin/animals', cookie, {
      name: 'To Delete',
      type: 'Cow',
      sex: 'Heifer',
      status: 'for-sale',
    });
    const { id } = (await createRes.json()) as { id: string };
    try {
      const delRes = await req('DELETE', `/api/admin/animals/${id}`, cookie);
      expect(delRes.status).toBe(200);

      const row = await env.DB.prepare('SELECT deleted_at FROM animals WHERE id = ?')
        .bind(id)
        .first<{ deleted_at: string | null }>();
      expect(row?.deleted_at).not.toBeNull();

      const publicListRes = await worker.fetch(new Request('http://example.com/api/animals'), env);
      const publicList = (await publicListRes.json()) as { id: string }[];
      expect(publicList.some((a) => a.id === id)).toBe(false);

      const secondDelete = await req('DELETE', `/api/admin/animals/${id}`, cookie);
      expect(secondDelete.status).toBe(404);
    } finally {
      await env.DB.prepare('DELETE FROM animals WHERE id = ?').bind(id).run();
    }
  });
});

describe('PUT /api/admin/animals/reorder', () => {
  it('rejects an empty order array', async () => {
    const res = await req('PUT', '/api/admin/animals/reorder', cookie, { order: [] });
    expect(res.status).toBe(400);
  });

  it('sets display_order to index * 10 for each id in order', async () => {
    const a = (await (
      await req('POST', '/api/admin/animals', cookie, {
        name: 'A',
        type: 'Cow',
        sex: 'Cow',
        status: 'for-sale',
      })
    ).json()) as { id: string };
    const b = (await (
      await req('POST', '/api/admin/animals', cookie, {
        name: 'B',
        type: 'Cow',
        sex: 'Cow',
        status: 'for-sale',
      })
    ).json()) as { id: string };
    try {
      const res = await req('PUT', '/api/admin/animals/reorder', cookie, { order: [b.id, a.id] });
      expect(res.status).toBe(200);

      const rows = await env.DB.prepare('SELECT id, display_order FROM animals WHERE id IN (?, ?)')
        .bind(a.id, b.id)
        .all<{ id: string; display_order: number }>();
      const byId = Object.fromEntries(rows.results.map((r) => [r.id, r.display_order]));
      expect(byId[b.id]).toBe(0);
      expect(byId[a.id]).toBe(10);
    } finally {
      await env.DB.prepare('DELETE FROM animals WHERE id IN (?, ?)').bind(a.id, b.id).run();
    }
  });
});

describe('animal media upload/delete', () => {
  it('uploads media to R2 and serves it back via GET /media/:key, then deletes it', async () => {
    const createRes = await req('POST', '/api/admin/animals', cookie, {
      name: 'Media Test',
      type: 'Cow',
      sex: 'Cow',
      status: 'for-sale',
    });
    const { id: animalId } = (await createRes.json()) as { id: string };
    try {
      const form = new FormData();
      form.set(
        'file',
        new File([new Uint8Array([1, 2, 3, 4])], 'photo.jpg', { type: 'image/jpeg' }),
      );
      form.set('media_type', 'image');

      const uploadRes = await worker.fetch(
        new Request(`http://example.com/api/admin/animals/${animalId}/media`, {
          method: 'POST',
          headers: { cookie },
          body: form,
        }),
        env,
      );
      expect(uploadRes.status).toBe(201);
      const media = (await uploadRes.json()) as { id: string; url: string };
      expect(media.url).toMatch(/^\/media\/animals\//);

      const audit = await latestAuditRow('animal_media');
      expect(audit?.action).toBe('animal.media.add');

      const mediaRes = await worker.fetch(new Request(`http://example.com${media.url}`), env);
      expect(mediaRes.status).toBe(200);
      expect(mediaRes.headers.get('content-type')).toBe('image/jpeg');

      const delRes = await req(
        'DELETE',
        `/api/admin/animals/${animalId}/media/${media.id}`,
        cookie,
      );
      expect(delRes.status).toBe(200);

      const afterDeleteRes = await worker.fetch(new Request(`http://example.com${media.url}`), env);
      expect(afterDeleteRes.status).toBe(404);
    } finally {
      await env.DB.prepare('DELETE FROM animal_media WHERE animal_id = ?').bind(animalId).run();
      await env.DB.prepare('DELETE FROM animals WHERE id = ?').bind(animalId).run();
    }
  });

  it('rejects an unknown media_type', async () => {
    const createRes = await req('POST', '/api/admin/animals', cookie, {
      name: 'Media Reject',
      type: 'Cow',
      sex: 'Cow',
      status: 'for-sale',
    });
    const { id: animalId } = (await createRes.json()) as { id: string };
    try {
      const form = new FormData();
      form.set('file', new File([new Uint8Array([1])], 'photo.jpg', { type: 'image/jpeg' }));
      form.set('media_type', 'audio');

      const res = await worker.fetch(
        new Request(`http://example.com/api/admin/animals/${animalId}/media`, {
          method: 'POST',
          headers: { cookie },
          body: form,
        }),
        env,
      );
      expect(res.status).toBe(400);
    } finally {
      await env.DB.prepare('DELETE FROM animals WHERE id = ?').bind(animalId).run();
    }
  });
});
