# D1 Migrations

SQL migration files for the D1 schema (SDD.md §5): `animals` (incl. the `deleted_at` soft-delete column — see `docs/SDD.md` change log 2026-07-20), `animal_media`, `admins`, `sessions`, `password_reset_tokens`, `site_content`, `site_settings`, `audit_log`.

Written in M2 (Development-Plan.md), applied locally via `wrangler d1 execute --local`, then to the real preview/production databases (`scattered-oaks-db-preview` / `scattered-oaks-db`) as part of the deploy pipeline (M9).
