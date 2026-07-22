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
          bindings: { TEST_MIGRATIONS: migrations, TEST_SEED_STATEMENTS: seedStatements },
        },
      }),
    ],
    test: {
      include: ['**/*.test.ts'],
      setupFiles: ['./vitest.setup.ts'],
    },
  };
});
