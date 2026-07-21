// Cloudflare Workers API entry point (SDD.md §4).
// M1 placeholder: static assets (Astro's dist/ build) are served automatically per
// wrangler.toml's [assets] config; this Worker only needs to handle /api/* routes,
// none of which exist yet. Real route modules (auth, animals, content, settings,
// admins, contact, uploads) land in M3/M5/M6.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return new Response('Not implemented yet', { status: 501 });
    }
    return new Response('Not found', { status: 404 });
  },
};
