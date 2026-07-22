import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../index';
import { hashPassword } from '../lib/password';

const ROOT_USERNAME = 'Root';
const ROOT_PASSWORD = 'DevRoot!2026';
const ROOT_EMAIL = 'dev-root@example.com';

function post(path: string, body: unknown, cookie?: string) {
  return worker.fetch(
    new Request(`http://example.com${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
    env,
  );
}

function get(path: string, cookie?: string) {
  return worker.fetch(
    new Request(`http://example.com${path}`, {
      headers: cookie ? { cookie } : {},
    }),
    env,
  );
}

function sessionCookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('Response had no Set-Cookie header');
  return setCookie.split(';')[0];
}

async function resetRootAccount() {
  await env.DB.prepare(
    `UPDATE admins SET failed_login_count = 0, locked_until = NULL WHERE username = ?`,
  )
    .bind(ROOT_USERNAME)
    .run();
  await env.DB.prepare(
    `DELETE FROM sessions WHERE admin_id = (SELECT id FROM admins WHERE username = ?)`,
  )
    .bind(ROOT_USERNAME)
    .run();
  await env.DB.prepare(
    `DELETE FROM password_reset_tokens WHERE admin_id = (SELECT id FROM admins WHERE username = ?)`,
  )
    .bind(ROOT_USERNAME)
    .run();
}

describe('POST /api/auth/login', () => {
  it('succeeds with the seeded Root credential and sets a session cookie', async () => {
    const res = await post('/api/auth/login', { username: ROOT_USERNAME, password: ROOT_PASSWORD });
    try {
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; forcePasswordChange: boolean };
      expect(body.success).toBe(true);
      expect(body.forcePasswordChange).toBe(false);
      expect(res.headers.get('set-cookie')).toContain('session=');
    } finally {
      await resetRootAccount();
    }
  });

  it('rejects a wrong password with a generic 401', async () => {
    const res = await post('/api/auth/login', {
      username: ROOT_USERNAME,
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Invalid username or password.');
    await resetRootAccount();
  });

  it('rejects an unknown username with the same generic 401 message', async () => {
    const res = await post('/api/auth/login', { username: 'nobody', password: 'whatever1!' });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Invalid username or password.');
  });

  it('locks the account after 3 consecutive failed attempts, then rejects even correct credentials', async () => {
    try {
      for (let i = 0; i < 2; i++) {
        const res = await post('/api/auth/login', {
          username: ROOT_USERNAME,
          password: 'wrong-password',
        });
        expect(res.status).toBe(401);
      }
      const lockingAttempt = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: 'wrong-password',
      });
      expect(lockingAttempt.status).toBe(423);

      const correctButLocked = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: ROOT_PASSWORD,
      });
      expect(correctButLocked.status).toBe(423);
    } finally {
      await resetRootAccount();
    }
  });

  it('resets the failed-login counter on a successful login', async () => {
    try {
      await post('/api/auth/login', { username: ROOT_USERNAME, password: 'wrong-password' });
      await post('/api/auth/login', { username: ROOT_USERNAME, password: 'wrong-password' });

      const ok = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: ROOT_PASSWORD,
      });
      expect(ok.status).toBe(200);

      const row = await env.DB.prepare('SELECT failed_login_count FROM admins WHERE username = ?')
        .bind(ROOT_USERNAME)
        .first<{ failed_login_count: number }>();
      expect(row?.failed_login_count).toBe(0);
    } finally {
      await resetRootAccount();
    }
  });
});

describe('POST /api/auth/logout', () => {
  it('rejects a request with no session cookie', async () => {
    const res = await post('/api/auth/logout', {});
    expect(res.status).toBe(401);
  });

  it('deletes the session so the cookie can no longer be used to authenticate', async () => {
    try {
      const loginRes = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: ROOT_PASSWORD,
      });
      const cookie = sessionCookieFrom(loginRes);

      const logoutRes = await post('/api/auth/logout', {}, cookie);
      expect(logoutRes.status).toBe(200);

      const reuseRes = await post(
        '/api/auth/change-password',
        { currentPassword: ROOT_PASSWORD, newPassword: 'Whatever123!' },
        cookie,
      );
      expect(reuseRes.status).toBe(401);
    } finally {
      await resetRootAccount();
    }
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns the same generic response whether or not the account exists', async () => {
    const known = await post('/api/auth/forgot-password', { email: ROOT_EMAIL });
    const unknown = await post('/api/auth/forgot-password', { email: 'nobody@example.com' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    await resetRootAccount();
  });

  it('creates a reset token for a known account', async () => {
    try {
      await post('/api/auth/forgot-password', { email: ROOT_EMAIL });
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM password_reset_tokens
         WHERE admin_id = (SELECT id FROM admins WHERE username = ?)`,
      )
        .bind(ROOT_USERNAME)
        .first<{ c: number }>();
      expect(row?.c).toBe(1);
    } finally {
      await resetRootAccount();
    }
  });

  it('does not create a second token within the cooldown window', async () => {
    try {
      await post('/api/auth/forgot-password', { email: ROOT_EMAIL });
      await post('/api/auth/forgot-password', { email: ROOT_EMAIL });
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM password_reset_tokens
         WHERE admin_id = (SELECT id FROM admins WHERE username = ?)`,
      )
        .bind(ROOT_USERNAME)
        .first<{ c: number }>();
      expect(row?.c).toBe(1);
    } finally {
      await resetRootAccount();
    }
  });
});

describe('POST /api/auth/reset-password', () => {
  it('rejects an unknown token', async () => {
    const res = await post('/api/auth/reset-password', {
      token: 'not-a-real-token',
      newPassword: 'NewPassword1!',
    });
    expect(res.status).toBe(400);
  });

  it('resets the password for a valid token, then rejects reuse of the same token', async () => {
    try {
      await post('/api/auth/forgot-password', { email: ROOT_EMAIL });

      // No email transport in tests — read the raw token straight out of the
      // request context isn't possible since only the hash is stored, so
      // insert a token we control instead of trying to intercept the stub.
      const rawToken = 'test-reset-token';
      const tokenHash = await sha256Hex(rawToken);
      const adminId = (
        await env.DB.prepare('SELECT id FROM admins WHERE username = ?')
          .bind(ROOT_USERNAME)
          .first<{ id: string }>()
      )?.id;
      await env.DB.prepare(
        `INSERT OR REPLACE INTO password_reset_tokens (token, admin_id, expires_at) VALUES (?, ?, ?)`,
      )
        .bind(tokenHash, adminId, new Date(Date.now() + 60_000).toISOString())
        .run();

      const resetRes = await post('/api/auth/reset-password', {
        token: rawToken,
        newPassword: 'NewPassword1!',
      });
      expect(resetRes.status).toBe(200);

      const loginWithNew = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: 'NewPassword1!',
      });
      expect(loginWithNew.status).toBe(200);

      const reuseRes = await post('/api/auth/reset-password', {
        token: rawToken,
        newPassword: 'AnotherPassword1!',
      });
      expect(reuseRes.status).toBe(400);
    } finally {
      // Restore the seeded Root password/hash so later tests can still log
      // in with ROOT_PASSWORD.
      const { hash, salt } = await hashPassword(ROOT_PASSWORD);
      await env.DB.prepare(
        'UPDATE admins SET password_hash = ?, password_salt = ? WHERE username = ?',
      )
        .bind(hash, salt, ROOT_USERNAME)
        .run();
      await resetRootAccount();
    }
  });

  it('rejects an expired token', async () => {
    try {
      const rawToken = 'already-expired-token';
      const tokenHash = await sha256Hex(rawToken);
      const adminId = (
        await env.DB.prepare('SELECT id FROM admins WHERE username = ?')
          .bind(ROOT_USERNAME)
          .first<{ id: string }>()
      )?.id;
      await env.DB.prepare(
        `INSERT OR REPLACE INTO password_reset_tokens (token, admin_id, expires_at) VALUES (?, ?, ?)`,
      )
        .bind(tokenHash, adminId, new Date(Date.now() - 60_000).toISOString())
        .run();

      const res = await post('/api/auth/reset-password', {
        token: rawToken,
        newPassword: 'NewPassword1!',
      });
      expect(res.status).toBe(400);
    } finally {
      await resetRootAccount();
    }
  });

  it('rejects a new password that fails the policy', async () => {
    try {
      const rawToken = 'policy-test-token';
      const tokenHash = await sha256Hex(rawToken);
      const adminId = (
        await env.DB.prepare('SELECT id FROM admins WHERE username = ?')
          .bind(ROOT_USERNAME)
          .first<{ id: string }>()
      )?.id;
      await env.DB.prepare(
        `INSERT OR REPLACE INTO password_reset_tokens (token, admin_id, expires_at) VALUES (?, ?, ?)`,
      )
        .bind(tokenHash, adminId, new Date(Date.now() + 60_000).toISOString())
        .run();

      const res = await post('/api/auth/reset-password', { token: rawToken, newPassword: 'weak' });
      expect(res.status).toBe(400);
    } finally {
      await resetRootAccount();
    }
  });
});

describe('POST /api/auth/change-password (forced first-login change)', () => {
  it('runs the full new-admin sequence: forced flag on login, change clears it, other sessions revoked', async () => {
    const tempAdminId = 'temp-admin-under-test';
    try {
      const { hash, salt } = await hashPassword('TempPassword1!');
      await env.DB.prepare(
        `INSERT INTO admins (id, username, email, password_hash, password_salt, role, force_password_change)
         VALUES (?, ?, ?, ?, ?, 'admin', 1)`,
      )
        .bind(tempAdminId, 'temp-admin', 'temp-admin@example.com', hash, salt)
        .run();

      const loginRes = await post('/api/auth/login', {
        username: 'temp-admin',
        password: 'TempPassword1!',
      });
      expect(loginRes.status).toBe(200);
      const loginBody = (await loginRes.json()) as { forcePasswordChange: boolean };
      expect(loginBody.forcePasswordChange).toBe(true);
      const firstCookie = sessionCookieFrom(loginRes);

      // A second concurrent session (e.g. another browser) to prove
      // change-password revokes sessions other than the current one.
      const secondLoginRes = await post('/api/auth/login', {
        username: 'temp-admin',
        password: 'TempPassword1!',
      });
      const secondCookie = sessionCookieFrom(secondLoginRes);

      const changeRes = await post(
        '/api/auth/change-password',
        { currentPassword: 'TempPassword1!', newPassword: 'PermanentPassword1!' },
        firstCookie,
      );
      expect(changeRes.status).toBe(200);

      const row = await env.DB.prepare('SELECT force_password_change FROM admins WHERE id = ?')
        .bind(tempAdminId)
        .first<{ force_password_change: number }>();
      expect(row?.force_password_change).toBe(0);

      const secondSessionRevoked = await post(
        '/api/auth/change-password',
        { currentPassword: 'PermanentPassword1!', newPassword: 'Whatever1!' },
        secondCookie,
      );
      expect(secondSessionRevoked.status).toBe(401);

      const firstSessionStillWorks = await post('/api/auth/logout', {}, firstCookie);
      expect(firstSessionStillWorks.status).toBe(200);
    } finally {
      await env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(tempAdminId).run();
      await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(tempAdminId).run();
    }
  });

  it('rejects an incorrect current password', async () => {
    try {
      const loginRes = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: ROOT_PASSWORD,
      });
      const cookie = sessionCookieFrom(loginRes);

      const res = await post(
        '/api/auth/change-password',
        { currentPassword: 'not-the-current-password', newPassword: 'NewPassword1!' },
        cookie,
      );
      expect(res.status).toBe(401);
    } finally {
      await resetRootAccount();
    }
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no session cookie', async () => {
    const res = await get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current admin for a valid session', async () => {
    try {
      const loginRes = await post('/api/auth/login', {
        username: ROOT_USERNAME,
        password: ROOT_PASSWORD,
      });
      const cookie = sessionCookieFrom(loginRes);

      const res = await get('/api/auth/me', cookie);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        username: string;
        role: string;
        forcePasswordChange: boolean;
      };
      expect(body.username).toBe(ROOT_USERNAME);
      expect(body.role).toBe('root');
      expect(body.forcePasswordChange).toBe(false);
    } finally {
      await resetRootAccount();
    }
  });
});

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
