# D1 Migrations

SQL migration files for the D1 schema (SDD.md §5): `animals` (incl. the `deleted_at` soft-delete column — see `docs/SDD.md` change log 2026-07-20), `animal_media`, `admins`, `sessions`, `password_reset_tokens`, `site_content`, `site_settings`, `audit_log` — plus `gallery_photos`, an `[AMENDED]` 2026-07-21 addition (the original SDD §5 never actually defined a table for `GET /api/gallery`).

Generated via `wrangler d1 migrations create scattered-oaks-db <name>` so numbering/tracking stays consistent with Wrangler's own bookkeeping (`d1_migrations` table). Applied locally via `wrangler d1 migrations apply scattered-oaks-db --local`, then to the real preview/production databases as part of the deploy pipeline (M9).

Sample/seed **data** (as opposed to schema) lives in `../seeds/`, not here — see that folder's README for why they're kept separate.
