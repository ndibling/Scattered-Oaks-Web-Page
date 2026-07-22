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

function put(path: string, cookie: string, body: unknown) {
  return worker.fetch(
    new Request(`http://example.com${path}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body),
    }),
    env,
  );
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
  await env.DB.prepare(
    "UPDATE site_settings SET value = 'true' WHERE key = 'showPublicPrices'",
  ).run();
  await env.DB.prepare("UPDATE site_settings SET value = 'grid' WHERE key = 'galleryStyle'").run();
});

describe('PUT /api/admin/settings', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await worker.fetch(
      new Request('http://example.com/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ showPublicPrices: false }),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('rejects an invalid galleryStyle', async () => {
    const res = await put('/api/admin/settings', cookie, { galleryStyle: 'carousel' });
    expect(res.status).toBe(400);
  });

  it('updates only the provided key, leaving the other untouched', async () => {
    const before = await put('/api/admin/settings', cookie, { galleryStyle: 'mosaic' });
    expect(before.status).toBe(200);
    const beforeBody = (await before.json()) as { showPublicPrices: boolean; galleryStyle: string };
    expect(beforeBody.galleryStyle).toBe('mosaic');
    expect(beforeBody.showPublicPrices).toBe(true);

    const after = await put('/api/admin/settings', cookie, { showPublicPrices: false });
    expect(after.status).toBe(200);
    const afterBody = (await after.json()) as { showPublicPrices: boolean; galleryStyle: string };
    expect(afterBody.showPublicPrices).toBe(false);
    expect(afterBody.galleryStyle).toBe('mosaic');
  });

  it('audit-logs the change', async () => {
    await put('/api/admin/settings', cookie, { galleryStyle: 'grid' });
    const audit = await env.DB.prepare(
      `SELECT action FROM audit_log WHERE target_type = 'site_settings' ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    ).first<{ action: string }>();
    expect(audit?.action).toBe('settings.update');
  });
});
