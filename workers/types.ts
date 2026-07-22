// Bindings from wrangler.toml — kept in one place so every route module and
// test file references the same shape.
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
};

export type AuthedAdmin = {
  id: string;
  username: string;
  role: 'root' | 'admin';
};

// Hono context variables set by middleware.ts's requireSession (M5) for
// downstream route handlers to read via c.get('admin'). auditTargetId/
// auditSummary are set by mutating handlers (M6) right before returning a
// 2xx response, for middleware.ts's auditLog to pick up after next().
export type Variables = {
  admin: AuthedAdmin;
  auditTargetId?: string;
  auditSummary?: string;
};

export type HonoEnv = { Bindings: Env; Variables: Variables };
