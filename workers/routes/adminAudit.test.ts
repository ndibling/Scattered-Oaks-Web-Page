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
});

describe('GET /api/admin/audit', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/admin/audit'), env);
    expect(res.status).toBe(401);
  });

  it('returns entries newest-first, paginated by limit/offset', async () => {
    const rootId = (
      await env.DB.prepare('SELECT id FROM admins WHERE username = ?').bind(ROOT_USERNAME).first<{
        id: string;
      }>()
    )?.id;
    const ids = ['audit-a', 'audit-b', 'audit-c'];
    for (const [i, id] of ids.entries()) {
      await env.DB.prepare(
        `INSERT INTO audit_log (id, admin_id, action, target_type, target_id, summary, created_at)
         VALUES (?, ?, 'test.action', 'test', ?, 'test row', datetime('now', ?))`,
      )
        .bind(id, rootId, id, `+${i} seconds`)
        .run();
    }
    try {
      const res = await worker.fetch(
        new Request('http://example.com/api/admin/audit?limit=2&offset=0', { headers: { cookie } }),
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { results: { id: string }[]; hasMore: boolean };
      expect(body.results).toHaveLength(2);
      expect(body.results[0].id).toBe('audit-c');
      expect(body.hasMore).toBe(true);
    } finally {
      await env.DB.prepare('DELETE FROM audit_log WHERE id IN (?, ?, ?)')
        .bind(...ids)
        .run();
    }
  });

  it('LEFT JOINs admins so a null admin_id (deleted actor) still renders', async () => {
    await env.DB.prepare(
      `INSERT INTO audit_log (id, admin_id, action, target_type, target_id, summary) VALUES (?, NULL, 'test.action', 'test', 'orphan', 'orphaned row')`,
    )
      .bind('audit-orphan')
      .run();
    try {
      const res = await worker.fetch(
        new Request('http://example.com/api/admin/audit?limit=1&offset=0', { headers: { cookie } }),
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        results: { admin_id: string | null; admin_username: string | null }[];
      };
      expect(body.results[0].admin_id).toBeNull();
      expect(body.results[0].admin_username).toBeNull();
    } finally {
      await env.DB.prepare('DELETE FROM audit_log WHERE id = ?').bind('audit-orphan').run();
    }
  });
});
