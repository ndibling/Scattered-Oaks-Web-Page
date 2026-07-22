import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import worker from '../index';
import { hashPassword } from '../lib/password';

// POST /api/admin/users (M7) now emails the temp password via Resend on
// every call — stub fetch globally in this file so tests don't make real
// network calls (harmless no-op for tests that never reach that code path).
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const ROOT_USERNAME = 'Root';
const ROOT_PASSWORD = 'DevRoot!2026';

function sessionCookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('Response had no Set-Cookie header');
  return setCookie.split(';')[0];
}

async function login(username: string, password: string): Promise<string> {
  const res = await worker.fetch(
    new Request('http://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
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

/** Inserts a non-root admin directly, matching the existing test convention
 * (auth.test.ts's temp-admin-under-test) since no second admin is seeded. */
async function createTempAdmin(id: string, username: string, role: 'root' | 'admin' = 'admin') {
  const { hash, salt } = await hashPassword('TempPassword1!');
  await env.DB.prepare(
    `INSERT INTO admins (id, username, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, username, `${username}@example.com`, hash, salt, role)
    .run();
}

async function deleteTempAdmin(id: string) {
  await env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM audit_log WHERE admin_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();
}

let rootCookie: string;

beforeAll(async () => {
  rootCookie = await login(ROOT_USERNAME, ROOT_PASSWORD);
});

afterAll(async () => {
  await env.DB.prepare(
    'DELETE FROM sessions WHERE admin_id = (SELECT id FROM admins WHERE username = ?)',
  )
    .bind(ROOT_USERNAME)
    .run();
});

describe('admin user endpoints require a session', () => {
  it('rejects an unauthenticated list', async () => {
    const res = await worker.fetch(new Request('http://example.com/api/admin/users'), env);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/users', () => {
  it('lists admins without password_hash/password_salt', async () => {
    const res = await req('GET', '/api/admin/users', rootCookie);
    expect(res.status).toBe(200);
    const list = (await res.json()) as Record<string, unknown>[];
    expect(list.some((a) => a.username === ROOT_USERNAME)).toBe(true);
    for (const admin of list) {
      expect(admin).not.toHaveProperty('password_hash');
      expect(admin).not.toHaveProperty('password_salt');
    }
  });
});

describe('POST /api/admin/users', () => {
  it('creates an admin with a temp password and force_password_change set, and never returns the password', async () => {
    const res = await req('POST', '/api/admin/users', rootCookie, {
      username: 'new-admin',
      email: 'new-admin@example.com',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; force_password_change: number };
    expect(body.force_password_change).toBe(1);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('tempPassword');
    expect(body).not.toHaveProperty('password_hash');

    try {
      const canLoginWithSomeGeneratedPassword = await env.DB.prepare(
        'SELECT password_hash FROM admins WHERE id = ?',
      )
        .bind(body.id)
        .first<{ password_hash: string }>();
      expect(canLoginWithSomeGeneratedPassword?.password_hash).toBeTruthy();

      const audit = await env.DB.prepare(
        `SELECT action FROM audit_log WHERE target_type = 'admin' AND target_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
        .bind(body.id)
        .first<{ action: string }>();
      expect(audit?.action).toBe('user.create');
    } finally {
      await deleteTempAdmin(body.id);
    }
  });

  it('emails the temp password to the new admin (never in the JSON response)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await req('POST', '/api/admin/users', rootCookie, {
      username: 'emailed-admin',
      email: 'emailed-admin@example.com',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };

    try {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.resend.com/emails');
      const emailBody = JSON.parse((init as RequestInit).body as string);
      expect(emailBody.to).toEqual(['emailed-admin@example.com']);
      // The temp password appears in the email body — that's the only
      // channel it goes out on (already asserted absent from the JSON
      // response in the test above).
      expect(emailBody.html).toMatch(/Temporary password: <strong>.+<\/strong>/);
    } finally {
      await deleteTempAdmin(body.id);
    }
  });

  it('rejects a duplicate username', async () => {
    const res = await req('POST', '/api/admin/users', rootCookie, {
      username: ROOT_USERNAME,
      email: 'someone-else@example.com',
      role: 'admin',
    });
    expect(res.status).toBe(400);
  });

  it('a non-root admin cannot create a root account (403)', async () => {
    const tempId = 'temp-admin-a';
    await createTempAdmin(tempId, 'temp-admin-a', 'admin');
    try {
      const cookie = await login('temp-admin-a', 'TempPassword1!');
      const res = await req('POST', '/api/admin/users', cookie, {
        username: 'wannabe-root',
        email: 'wannabe-root@example.com',
        role: 'root',
      });
      expect(res.status).toBe(403);
    } finally {
      await deleteTempAdmin(tempId);
    }
  });

  it('root can create another root account', async () => {
    const res = await req('POST', '/api/admin/users', rootCookie, {
      username: 'second-root',
      email: 'second-root@example.com',
      role: 'root',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    await deleteTempAdmin(body.id);
  });
});

describe('PUT /api/admin/users/:id', () => {
  it('a non-root admin can edit another admin-role account (email)', async () => {
    const editorId = 'temp-editor';
    const targetId = 'temp-target';
    await createTempAdmin(editorId, 'temp-editor', 'admin');
    await createTempAdmin(targetId, 'temp-target', 'admin');
    try {
      const cookie = await login('temp-editor', 'TempPassword1!');
      const res = await req('PUT', `/api/admin/users/${targetId}`, cookie, {
        email: 'updated@example.com',
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { email: string };
      expect(body.email).toBe('updated@example.com');
    } finally {
      await deleteTempAdmin(editorId);
      await deleteTempAdmin(targetId);
    }
  });

  it('a non-root admin cannot promote an account to root (403)', async () => {
    const editorId = 'temp-editor-2';
    const targetId = 'temp-target-2';
    await createTempAdmin(editorId, 'temp-editor-2', 'admin');
    await createTempAdmin(targetId, 'temp-target-2', 'admin');
    try {
      const cookie = await login('temp-editor-2', 'TempPassword1!');
      const res = await req('PUT', `/api/admin/users/${targetId}`, cookie, { role: 'root' });
      expect(res.status).toBe(403);
    } finally {
      await deleteTempAdmin(editorId);
      await deleteTempAdmin(targetId);
    }
  });

  it("a non-root admin cannot force-set another admin's password (403)", async () => {
    const editorId = 'temp-editor-3';
    const targetId = 'temp-target-3';
    await createTempAdmin(editorId, 'temp-editor-3', 'admin');
    await createTempAdmin(targetId, 'temp-target-3', 'admin');
    try {
      const cookie = await login('temp-editor-3', 'TempPassword1!');
      const res = await req('PUT', `/api/admin/users/${targetId}`, cookie, {
        newPassword: 'BrandNew1!',
      });
      expect(res.status).toBe(403);
    } finally {
      await deleteTempAdmin(editorId);
      await deleteTempAdmin(targetId);
    }
  });

  it("root can force-set another admin's password, which also revokes their sessions", async () => {
    const targetId = 'temp-target-4';
    await createTempAdmin(targetId, 'temp-target-4', 'admin');
    try {
      const targetCookie = await login('temp-target-4', 'TempPassword1!');
      const stillValid = await req('GET', '/api/auth/me', targetCookie);
      expect(stillValid.status).toBe(200);

      const res = await req('PUT', `/api/admin/users/${targetId}`, rootCookie, {
        newPassword: 'RootForced1!',
      });
      expect(res.status).toBe(200);

      const revoked = await req('GET', '/api/auth/me', targetCookie);
      expect(revoked.status).toBe(401);

      const loginWithNew = await login('temp-target-4', 'RootForced1!');
      expect(loginWithNew).toContain('session=');
    } finally {
      await deleteTempAdmin(targetId);
    }
  });

  it('404s for an unknown id', async () => {
    const res = await req('PUT', '/api/admin/users/does-not-exist', rootCookie, {
      email: 'x@example.com',
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/users/:id', () => {
  it('deletes a non-root admin', async () => {
    const targetId = 'temp-target-5';
    await createTempAdmin(targetId, 'temp-target-5', 'admin');
    const res = await req('DELETE', `/api/admin/users/${targetId}`, rootCookie);
    expect(res.status).toBe(200);
    const row = await env.DB.prepare('SELECT id FROM admins WHERE id = ?').bind(targetId).first();
    expect(row).toBeNull();
  });

  it('cannot delete the Root account (403)', async () => {
    const rootId = (
      await env.DB.prepare('SELECT id FROM admins WHERE username = ?').bind(ROOT_USERNAME).first<{
        id: string;
      }>()
    )?.id;
    const res = await req('DELETE', `/api/admin/users/${rootId}`, rootCookie);
    expect(res.status).toBe(403);
  });

  it('succeeds for an admin who already has an audit_log row referencing them (migration 0003)', async () => {
    const targetId = 'temp-target-6';
    await createTempAdmin(targetId, 'temp-target-6', 'admin');
    await env.DB.prepare(
      `INSERT INTO audit_log (id, admin_id, action, target_type, target_id, summary) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        targetId,
        'content.update',
        'site_content',
        'hero.headline',
        'test',
      )
      .run();

    const res = await req('DELETE', `/api/admin/users/${targetId}`, rootCookie);
    expect(res.status).toBe(200);

    const auditRow = await env.DB.prepare(
      'SELECT admin_id FROM audit_log WHERE target_id = ? AND target_type = ?',
    )
      .bind('hero.headline', 'site_content')
      .first<{ admin_id: string | null }>();
    expect(auditRow?.admin_id).toBeNull();

    await env.DB.prepare('DELETE FROM audit_log WHERE target_id = ? AND target_type = ?')
      .bind('hero.headline', 'site_content')
      .run();
  });
});
