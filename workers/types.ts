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
// downstream route handlers to read via c.get('admin').
export type Variables = {
  admin: AuthedAdmin;
};

export type HonoEnv = { Bindings: Env; Variables: Variables };
