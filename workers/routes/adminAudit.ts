// [ADDED] 2026-07-22 (M6, SDD §4.3). Read-only audit log (Requirements
// §7.2.4). LEFT JOIN, not INNER — migration 0003 makes admin_id nullable
// (ON DELETE SET NULL), so a row must survive its actor's account being
// deleted rather than silently vanishing from the log.
import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requireSession } from '../middleware';

type AuditLogRow = {
  id: string;
  admin_id: string | null;
  admin_username: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string | null;
  created_at: string;
};

const DEFAULT_LIMIT = 50;

export const adminAudit = new Hono<HonoEnv>();
adminAudit.use('*', requireSession);

// GET /api/admin/audit?limit=&offset=
adminAudit.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || DEFAULT_LIMIT, 200);
  const offset = Number(c.req.query('offset')) || 0;

  const { results } = await c.env.DB.prepare(
    `SELECT audit_log.id, audit_log.admin_id, admins.username AS admin_username,
            audit_log.action, audit_log.target_type, audit_log.target_id,
            audit_log.summary, audit_log.created_at
     FROM audit_log
     LEFT JOIN admins ON admins.id = audit_log.admin_id
     ORDER BY audit_log.created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(limit + 1, offset)
    .all<AuditLogRow>();

  const hasMore = results.length > limit;
  return c.json({ results: results.slice(0, limit), hasMore });
});
