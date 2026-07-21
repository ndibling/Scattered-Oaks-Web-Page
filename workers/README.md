# Workers API

The Cloudflare Worker script (SDD.md §4) that handles `/api/*` — everything else falls through to the static Astro build served via `wrangler.toml`'s `[assets]` config (SDD.md §2.1's 2026-07-21 amendment: one Worker, `scattered-oaks-farms`, serving both).

`index.ts` is the M1 placeholder entry point. Real route modules — `auth`, `animals`, `content`, `settings`, `admins`, `contact`, `uploads` — land in M3 (public endpoints), M5 (auth), and M6 (admin endpoints), behind a small router with shared middleware for session auth, rate limiting, and audit logging.
