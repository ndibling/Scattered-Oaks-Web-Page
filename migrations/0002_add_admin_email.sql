-- Migration number: 0002 	 2026-07-22T01:35:17.183Z
-- [AMENDED] 2026-07-21 — SDD.md §5.3's admins table never had an email
-- column, despite password-reset and new-admin-invite emails (Requirements
-- §7.2.4) needing somewhere to send to. Discovered during M5 implementation.

ALTER TABLE admins ADD COLUMN email TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX idx_admins_email ON admins (email);
