// [ADDED] 2026-07-22 (M7). Public site key for the Turnstile widget — safe
// to ship in frontend code by design (only the secret key is sensitive).
// Astro's PUBLIC_* build-time env var convention (first use in this repo);
// defaults to Cloudflare's published "always passes" test sitekey so local
// dev/E2E work with zero setup. Production build sets
// PUBLIC_TURNSTILE_SITE_KEY to the real registered site key (SDD.md §10.2).
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA';
