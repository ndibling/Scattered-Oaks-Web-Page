// [ADDED] 2026-07-23 (M9). One-time production bootstrap for Requirements.md
// §7.2.4 / SDD.md §10.2 item 19 — without this, M11's "log in as Root using
// the bootstrap credential" has no account to log into. Run only from the
// CI `deploy` job (see .github/workflows/ci.yml), never as an `npm run`
// script — that keeps it from being a one-keystroke mistake against
// production from a local machine.
//
// Reuses the real `hashPassword`/`validatePasswordPolicy` from
// workers/lib/password.ts directly — pure WebCrypto, no Cloudflare-specific
// API, already proven safe to import into a plain Node context by
// e2e/security-flow.spec.ts (M8). Invoked via
// `node --experimental-strip-types scripts/seed-root-admin.ts`.
//
// Idempotent: INSERT OR IGNORE keyed on a fixed id means the first
// successful production deploy creates the real Root row from that run's
// bootstrap secret, and every deploy after that — including after M11
// rotates ROOT_ADMIN_BOOTSTRAP_PASSWORD to a fresh throwaway value — is a
// safe no-op. It can never overwrite a password Root has already changed.

import { execFileSync } from 'node:child_process';
import { hashPassword, validatePasswordPolicy } from '../workers/lib/password.ts';

const ROOT_ID = 'root-prod';
const ROOT_USERNAME = 'Root';
const ROOT_EMAIL = 'nate.dibling@gmail.com';

const password = process.env.ROOT_ADMIN_BOOTSTRAP_PASSWORD;
if (!password) {
  console.error('ROOT_ADMIN_BOOTSTRAP_PASSWORD is not set.');
  process.exit(1);
}

const policyError = validatePasswordPolicy(password);
if (policyError) {
  console.error(`ROOT_ADMIN_BOOTSTRAP_PASSWORD fails the password policy: ${policyError}`);
  process.exit(1);
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

const { hash, salt } = await hashPassword(password);

const sql = `INSERT OR IGNORE INTO admins (id, username, email, password_hash, password_salt, role, force_password_change) VALUES ('${escapeSqlString(ROOT_ID)}', '${escapeSqlString(ROOT_USERNAME)}', '${escapeSqlString(ROOT_EMAIL)}', '${hash}', '${salt}', 'root', 1);`;

execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'scattered-oaks-db', '--remote', '--command', sql],
  {
    stdio: 'inherit',
    shell: false,
  },
);

console.log(
  'Production Root admin bootstrap: done (created if missing, no-op if it already existed).',
);
