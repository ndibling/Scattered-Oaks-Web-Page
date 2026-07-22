import path from 'node:path';
import { readFileSync } from 'node:fs';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, '..', 'migrations');
  const migrations = await readD1Migrations(migrationsPath);
  // D1's exec() binding (unlike `wrangler d1 execute --file`) splits on
  // newlines rather than parsing real statement boundaries, so it can't
  // handle our multi-line INSERT ... VALUES formatting or comment lines.
  // Strip comments and split into individual single-line statements instead,
  // run via env.DB.batch() in the setup file.
  const seedSqlRaw = readFileSync(path.join(__dirname, '..', 'seeds', 'sample-data.sql'), 'utf-8');
  const seedStatements = seedSqlRaw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: '../wrangler.toml' },
        miniflare: {
          // Test-only bindings so the setup file can apply schema + seed data
          // to each test's isolated D1 storage before tests run.
          // [ADDED] 2026-07-22 (M7) — RESEND_API_KEY/TURNSTILE_SECRET_KEY set
          // explicitly here rather than relying on .dev.vars being picked up
          // by cloudflareTest (unconfirmed whether it auto-loads that file
          // the way `wrangler dev` does) — deterministic regardless of
          // whether a given machine/CI runner has .dev.vars at all.
          // TURNSTILE_SECRET_KEY is Cloudflare's real published "always
          // passes" test secret (workers/lib/turnstile.test.ts hits the real
          // siteverify endpoint with it, no mocking). RESEND_API_KEY is a
          // placeholder — workers/lib/email.ts's tests stub global fetch
          // rather than calling the real Resend API.
          bindings: {
            TEST_MIGRATIONS: migrations,
            TEST_SEED_STATEMENTS: seedStatements,
            RESEND_API_KEY: 'test-resend-key',
            TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
          },
        },
      }),
    ],
    test: {
      include: ['**/*.test.ts'],
      setupFiles: ['./vitest.setup.ts'],
    },
  };
});
