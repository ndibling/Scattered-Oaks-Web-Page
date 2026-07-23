// [ADDED] 2026-07-22 (M7). Public site key for the Turnstile widget — safe
// to ship in frontend code by design (only the secret key is sensitive).
// Astro's PUBLIC_* build-time env var convention (first use in this repo);
// defaults to Cloudflare's published "always passes" test sitekey so local
// dev/E2E work with zero setup. Production build sets
// PUBLIC_TURNSTILE_SITE_KEY to the real registered site key (SDD.md §10.2).
//
// [AMENDED] 2026-07-23 (M9 follow-up) — was `?? fallback`, which only
// catches null/undefined. A GitHub Actions repo Variable that's unset (or
// was momentarily unset) substitutes as an **empty string**, not undefined,
// which slipped past `??` and reached Turnstile's widget as
// sitekey="" — a real production bug: `TurnstileError: Invalid input for
// parameter "sitekey", got ""`, thrown on every page load, which meant the
// contact form's widget never resolved a token at all. `||` treats the
// falsy empty string the same as unset, so this can't recur even if the
// variable is ever misconfigured again.
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
