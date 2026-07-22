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
  // Restore the seeded value in case a test in this file changed it.
  await env.DB.prepare('UPDATE site_content SET value_text = ? WHERE key = ?')
    .bind('Small Farm, Big Personalities.', 'hero.headline')
    .run();
});

describe('PUT /api/admin/content/:key', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/content/hero.headline', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'X' }),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('404s for an unknown key', async () => {
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/content/not.a.real.key', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ value: 'X' }),
      }),
      env,
    );
    expect(res.status).toBe(404);
  });

  it('updates a text field and records who changed it', async () => {
    const rootId = (
      await env.DB.prepare('SELECT id FROM admins WHERE username = ?').bind(ROOT_USERNAME).first<{
        id: string;
      }>()
    )?.id;

    const res = await worker.fetch(
      new Request('http://example.com/api/admin/content/hero.headline', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ value: 'A New Headline' }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { key: string; value: string };
    expect(body.value).toBe('A New Headline');

    const row = await env.DB.prepare(
      'SELECT value_text, updated_by FROM site_content WHERE key = ?',
    )
      .bind('hero.headline')
      .first<{ value_text: string; updated_by: string }>();
    expect(row?.value_text).toBe('A New Headline');
    expect(row?.updated_by).toBe(rootId);

    const audit = await env.DB.prepare(
      `SELECT action, target_id FROM audit_log WHERE target_type = 'site_content' ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    ).first<{ action: string; target_id: string }>();
    expect(audit?.action).toBe('content.update');
    expect(audit?.target_id).toBe('hero.headline');
  });

  it('rejects a multipart upload for a text-only key', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' }));
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/content/hero.headline', {
        method: 'PUT',
        headers: { cookie },
        body: form,
      }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('replaces an image-backed key via multipart upload and deletes the old R2 object', async () => {
    const form1 = new FormData();
    form1.set('file', new File([new Uint8Array([1, 2, 3])], 'v1.jpg', { type: 'image/jpeg' }));
    const res1 = await worker.fetch(
      new Request('http://example.com/api/admin/content/hero.photo_url', {
        method: 'PUT',
        headers: { cookie },
        body: form1,
      }),
      env,
    );
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as { value: string };
    expect(body1.value).toMatch(/^\/media\/content\/hero\.photo_url-/);

    const firstUrl = body1.value;

    const form2 = new FormData();
    form2.set('file', new File([new Uint8Array([4, 5, 6])], 'v2.jpg', { type: 'image/jpeg' }));
    const res2 = await worker.fetch(
      new Request('http://example.com/api/admin/content/hero.photo_url', {
        method: 'PUT',
        headers: { cookie },
        body: form2,
      }),
      env,
    );
    expect(res2.status).toBe(200);

    const oldObjectRes = await worker.fetch(new Request(`http://example.com${firstUrl}`), env);
    expect(oldObjectRes.status).toBe(404);

    // Restore the seed's original placeholder path so other tests/pages aren't affected.
    await env.DB.prepare('UPDATE site_content SET value_text = ? WHERE key = ?')
      .bind('/uploads/Scattered Oaks Farm 3.jpg', 'hero.photo_url')
      .run();
  });
});
