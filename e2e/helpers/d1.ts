import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// [ADDED] 2026-07-23 (M8). Only e2e/security-flow.spec.ts needs direct D1
// access — every other spec drives state entirely through the UI/API, same
// as before this file existed. Playwright drives an external `wrangler dev`
// process with no `env.DB` binding the way Vitest integration tests have,
// so shelling out to the same `wrangler d1 execute --local` CLI already
// used by `npm run seed:local` is the only way to set up/tear down
// security-sensitive state (a locked account, a password-reset token, a
// forced-first-login admin) that can't be reached through the app itself.
//
// Invoked as `node <wrangler's real .js entry point> ...` rather than via
// `npx`/`wrangler.cmd`: on Windows, .cmd shims can't be spawned without
// `shell: true`, and `shell: true` doesn't escape array arguments (Node's
// own DEP0190 warning) — it just concatenates them, so a multi-word SQL
// `--command` string gets word-split by cmd.exe before wrangler ever sees
// it (confirmed: this exact failure, "Unknown arguments: INTO, admins,
// ..."). `node` is a real executable on every platform, so invoking
// wrangler's actual entry script through it needs no shell and no
// escaping at all.
const dir = path.dirname(fileURLToPath(import.meta.url));
const WRANGLER_ENTRY = path.join(dir, '..', '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js');

export function d1Exec(sql: string): void {
  execFileSync(
    process.execPath,
    [WRANGLER_ENTRY, 'd1', 'execute', 'scattered-oaks-db', '--local', '--command', sql],
    { stdio: 'pipe' },
  );
}
