import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Setup files run outside per-test-file storage isolation and may run
// multiple times; applyD1Migrations only applies unapplied migrations, and
// the seed SQL is idempotent (INSERT OR REPLACE), so re-running both is safe.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
await env.DB.batch(env.TEST_SEED_STATEMENTS.map((sql: string) => env.DB.prepare(sql)));
