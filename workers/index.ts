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
import { media } from './routes/media';
import { contact } from './routes/contact';
import { adminAnimals } from './routes/adminAnimals';
import { adminGallery } from './routes/adminGallery';
import { adminContent } from './routes/adminContent';
import { adminSettings } from './routes/adminSettings';
import { adminUsers } from './routes/adminUsers';
import { adminAudit } from './routes/adminAudit';

const app = new Hono<HonoEnv>();

// M3: public routes (no auth). auth (M5) applies requireSession itself to
// its logout/change-password/me sub-routes — see routes/auth.ts. media (M6)
// is also public — see routes/media.ts.
app.route('/api/animals', animals);
app.route('/api/gallery', gallery);
app.route('/api/content', content);
app.route('/api/settings', settings);
app.route('/api/auth', auth);
app.route('/media', media);
app.route('/api/contact', contact);

// M6: admin routes. Each router applies requireSession to itself via
// `.use('*', requireSession)` and chains auditLog per mutating route — see
// middleware.ts and each router for details.
app.route('/api/admin/animals', adminAnimals);
app.route('/api/admin/gallery', adminGallery);
app.route('/api/admin/content', adminContent);
app.route('/api/admin/settings', adminSettings);
app.route('/api/admin/users', adminUsers);
app.route('/api/admin/audit', adminAudit);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
