-- Migration number: 0003 	 2026-07-22T00:00:00.000Z
-- [AMENDED] 2026-07-22 — audit_log.admin_id was NOT NULL with a plain
-- REFERENCES admins(id) (no ON DELETE clause, so SQLite/D1 default to
-- RESTRICT). M6 makes real audit logging near-universal, so DELETE
-- /api/admin/users/:id on any admin with a logged action would then fail
-- with a foreign-key violation — the exact feature this milestone builds.
-- Preserving audit history after the actor's account is deleted is also
-- the correct behavior for an accountability log, not just a workaround.
-- SQLite can't ALTER a column's nullability/FK clause in place, so this is
-- the standard create-copy-drop-rename pattern. See SDD.md §5.4.

CREATE TABLE audit_log_new (
  id TEXT PRIMARY KEY,
  admin_id TEXT REFERENCES admins (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit_log_new (id, admin_id, action, target_type, target_id, summary, created_at)
  SELECT id, admin_id, action, target_type, target_id, summary, created_at FROM audit_log;

DROP TABLE audit_log;
ALTER TABLE audit_log_new RENAME TO audit_log;

CREATE INDEX idx_audit_log_admin_id ON audit_log (admin_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
