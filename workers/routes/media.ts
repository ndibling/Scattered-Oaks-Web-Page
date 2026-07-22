// [ADDED] 2026-07-22 (M6, SDD §4.1). Public, unauthenticated — serves R2
// objects uploaded via the admin endpoints. No public R2 domain is
// configured anywhere in this project's Cloudflare setup, so uploads are
// served through this same Worker instead, mounted at /media (not /api),
// matching the shape of the existing static /uploads/... placeholder paths
// so <img src> code never has to branch between the two.
import { Hono } from 'hono';
import type { Env } from '../types';

export const media = new Hono<{ Bindings: Env }>();

media.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/media\//, '');
  const object = await c.env.MEDIA.get(key);
  if (!object) {
    return c.notFound();
  }
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
});
