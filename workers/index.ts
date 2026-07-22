// Cloudflare Workers API entry point (SDD.md §4). Static assets (Astro's
// dist/ build) are served automatically per wrangler.toml's [assets] config;
// this Worker only handles /api/*.
import { Hono } from 'hono';
import type { HonoEnv } from './types';
import { animals } from './routes/animals';
import { gallery } from './routes/gallery';
import { content } from './routes/content';
import { settings } from './routes/settings';
import { auth } from './routes/auth';

const app = new Hono<HonoEnv>();

// M3: public routes (no auth). admins/contact/uploads land in M6/M7, each
// mounted the same way, with requireSession/auditLog from ./middleware
// applied to the routers that need them. auth (M5) applies requireSession
// itself to its logout/change-password sub-routes — see routes/auth.ts.
app.route('/api/animals', animals);
app.route('/api/gallery', gallery);
app.route('/api/content', content);
app.route('/api/settings', settings);
app.route('/api/auth', auth);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
