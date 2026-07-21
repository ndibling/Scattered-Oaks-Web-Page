-- Migration number: 0001 	 2026-07-21T22:02:17.685Z
-- Initial schema (SDD.md §5), plus gallery_photos — see SDD.md change log
-- 2026-07-21: the original schema had no table backing GET /api/gallery or the
-- design prototype's 9-item captioned gallery grid; added here.

CREATE TABLE animals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  registered_name TEXT,
  type TEXT NOT NULL,
  sex TEXT NOT NULL,
  age_text TEXT,
  status TEXT NOT NULL CHECK (status IN ('for-sale', 'pending', 'coming-soon', 'not-for-sale')),
  price_cents INTEGER,
  description TEXT,
  imza_number TEXT,
  expected_height TEXT,
  sire_registered_name TEXT,
  dam_registered_name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_animals_status ON animals (status);
CREATE INDEX idx_animals_deleted_at ON animals (deleted_at);
CREATE INDEX idx_animals_display_order ON animals (display_order);

CREATE TABLE animal_media (
  id TEXT PRIMARY KEY,
  animal_id TEXT NOT NULL REFERENCES animals (id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_animal_media_animal_id ON animal_media (animal_id);

-- [AMENDED] 2026-07-21 — not in the original SDD §5 tables; added to back
-- GET /api/gallery and the design prototype's captioned gallery grid.
CREATE TABLE gallery_photos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gallery_photos_display_order ON gallery_photos (display_order);

CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('root', 'admin')),
  force_password_change INTEGER NOT NULL DEFAULT 0,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_admin_id ON sessions (admin_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE password_reset_tokens (
  token TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_admin_id ON password_reset_tokens (admin_id);

CREATE TABLE site_content (
  key TEXT PRIMARY KEY,
  value_text TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT REFERENCES admins (id)
);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins (id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_admin_id ON audit_log (admin_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
