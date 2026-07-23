# Scattered Oaks Farms — Software Development Plan

Version 1.0 — derived from Requirements v2.1 and SDD v1.0. Turns those two documents into an ordered, actionable build sequence with milestones, dependencies, and exit criteria.

## How this plan is organized

Two tracks run in parallel because they don't depend on each other until late:

- **Track A — Build** (M1–M8): all application code. Runs entirely against **local dev tooling** (`wrangler dev`, local D1/SQLite, local file storage stand-in for R2) — no Cloudflare account, GitHub secrets, or Resend account required until Track B is done.
- **Track B — Manual Cloud/GitHub Setup** (SDD §10): one-time human clicking in GitHub, Cloudflare, and Resend dashboards. Independent of Track A's code; can start on day one or be deferred — it only gates the *first real deploy*, not local development.

They converge at **M9 (CI/CD wiring + first deploy)**, which needs both application code and cloud accounts to exist.

```
Track A: M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 ─┐
                                                  ├─→ M9 → M10 → M11
Track B: B1 (GitHub) → B2 (Cloudflare) → B3 (Resend) ─┘
```

Testing isn't a separate late phase — each milestone in Track A ends with its own unit/integration tests (SDD §8), so coverage builds up incrementally instead of being bolted on at the end. E2E (Playwright) tests are added in M8 once full flows exist end-to-end.

---

## Track A — Build

### M1. Repo & Project Scaffold
Set up the Astro project, folder layout, and tooling — no backend logic yet. Track B is done as of 2026-07-21 (see `Manual-Setup-Guide.md`'s "Resources Created" section for the actual D1/R2/zone/account values this milestone consumes — no more placeholders needed).
- `npm create astro@latest`, add React/Preact integration for islands.
- Folder structure: `src/pages`, `src/components` (public), `src/admin` (admin islands), `src/lib` (shared client), `functions/` or `workers/` for the API, `migrations/` for D1 schema.
- Extract the Claude Design tokens (OKLCH colors, Quicksand/Nunito, spacing/radius) into a single shared tokens module (SDD §3.3) — this is the one file later design-iteration passes touch.
- `wrangler.toml` with the real D1/R2 bindings and named `[env.preview]`/`[env.production]` environments (SDD §2.2's 2026-07-21 amendment — one Worker project, `scattered-oaks-farms`, not separately-named Workers per environment).
- Before scaffolding: check what's actually live at the `scattered-oaks-farms` Worker/`scattered-oaks-zebu.com` right now — Cloudflare's Workers Builds produced deployed versions during Phase E of manual setup despite no application code existing yet, which wasn't investigated at the time. **Resolved 2026-07-21:** it's just Cloudflare's default "Hello world" placeholder template — confirmed via `curl https://scattered-oaks-zebu.com/`. Nothing to migrate away from; the real deploy (M9) overwrites it.
- ESLint/Prettier, Vitest, Playwright installed and configured (no tests yet, just runnable).
- **Exit criteria:** `npm run dev` serves a blank Astro shell locally; `npm test` runs (green, zero tests).

### M2. Data Layer
Implement the D1 schema and local dev database, matching SDD §5 exactly.
- Migration files for `animals`, `animal_media`, `admins`, `sessions`, `password_reset_tokens`, `site_content`, `site_settings`, `audit_log`.
- `animals` gets one column beyond SDD §5.1: `deleted_at` (TIMESTAMP, nullable) — see "Open decisions" resolution below; animal deletion is soft, not a hard row delete.
- Seed script producing sample data (11 design-prototype animals) for local/preview use — this becomes the preview-environment seed later (SDD §2.2).
- Run migrations against local D1 (`wrangler d1 execute --local`).
- **Unit tests:** schema constraints, seed script idempotency.
- **Exit criteria:** local D1 has all tables; seed script populates sample animals reproducibly.

### M3. Backend — Public API
Cloudflare Workers routes that don't require auth (SDD §4.1).
- `GET /api/animals` (with `?status=` filter), `GET /api/animals/:id`, `GET /api/gallery`, `GET /api/content`, `GET /api/settings`.
- All public animal queries filter `WHERE deleted_at IS NULL` — soft-deleted animals never appear on the public site.
- Router + middleware skeleton (the same middleware layer M5 will extend with session auth, rate limiting, audit logging).
- **Integration tests:** each endpoint against local D1 via `@cloudflare/vitest-pool-workers`. Two setup notes for M5/M6, which will need the same test harness:
  - Vitest 4 removed `vitest.workspace.ts` in favor of a `test.projects` array in the root `vitest.config.ts` — one inline project for plain-Node tests (`migrations/**`), one pointing at `workers/vitest.config.ts` for the actual Workers-runtime (Miniflare) tests, since the two need incompatible environments in one repo.
  - `env.DB.exec()` (the D1 binding method, as opposed to `wrangler d1 execute --file`) splits input by newline, not by real statement boundaries, and chokes on comment-only lines. Multi-line `INSERT ... VALUES` formatting and `--` comments both break it. `workers/vitest.config.ts` works around this by stripping comments and splitting `seeds/sample-data.sql` into single-line statements, applied via `env.DB.batch()` in `workers/vitest.setup.ts` instead of `exec()`.
- **Exit criteria:** all five public endpoints return real data from the seeded local D1, verified by integration tests.

### M4. Frontend — Public Site
Pixel-faithful rebuild of the Claude Design prototype (requirements §6.4 step 4), wired to M3's live API instead of hardcoded content.
- Components: Header/Nav, Hero, About, AnimalGrid + FilterTabs, AnimalCard, AnimalDetailModal (photo/video carousel), Gallery + GalleryLightbox, ContactForm (Turnstile widget wired in M7), Footer.
- Fetch animals/gallery/content/settings from M3's API at build/request time (SDD §3.4) — confirms the "admin edit needs no redeploy" requirement holds architecturally, even before M6's editor exists.
- Responsive breakpoints, `clamp()` fluid type, WCAG 2.1 AA basics (contrast, alt text, keyboard nav on the lightbox and filter tabs) — requirements §8.3.
- SEO basics: meta tags, Open Graph, `sitemap.xml`, `robots.txt` (§8.4).
- **E2E tests (Playwright), visitor flow subset:** browse, apply each filter tab, open detail lightbox + carousel.
- **Exit criteria:** local dev site is visually/behaviorally indistinguishable from the Claude Design prototype, backed by live local data.
- **Gotcha for M6 (and any future component work):** Preact's inline `<style>{...}</style>` tags are **not** scoped the way Astro's own `.astro` `<style>` blocks are — they render as literal global `<style>` elements, so identically-named classes across sibling components (`.eyebrow`, `.heading`, `.badge`, `.overlay`, `.modal`, `.name`, `.close-btn`, etc.) silently collide, with the last-rendered component's rule winning site-wide. Hit this in M4 (AnimalGrid's heading rendered white/washed-out because ContactForm's `.heading` rule, targeting its own dark teal section, loaded later and won the cascade) — fixed by prefixing every class per-component (`hero-*`, `about-*`, `card-*`, `modal-*`, `gallery-*`, `lightbox-*`, `contact-*`). Give every new admin component (M6) its own class prefix from the start rather than discovering this the same way.

### M5. Backend — Auth & Session Security
Implements SDD §6.1–§6.3 exactly.
- PBKDF2-SHA256 password hashing via WebCrypto SubtleCrypto (no external crypto deps).
- `POST /api/auth/login` (lockout-after-3 logic), `POST /api/auth/logout`, `POST /api/auth/forgot-password` (generic response either way), `POST /api/auth/reset-password`, `POST /api/auth/change-password`.
- Signed, httpOnly, Secure, SameSite=Strict session cookies; `sessions` table for revocation.
- Rate limiting on login/forgot-password (§8.1).
- Email sending stubbed/mocked in dev (real Resend wiring is M7 + B3).
- **Unit tests:** password hashing/verification, lockout counting, token generation/expiry (SDD §8 table).
- **Integration tests:** full login → lockout → reset → forced-first-login-change sequences against local D1.
- **Exit criteria:** all five auth endpoints pass their integration tests locally, including the 3-attempt lockout and reset-token single-use/expiry behavior.
- `[AMENDED]` 2026-07-21 — `admins` had no `email` column (needed for password-reset/invite emails, Requirements §7.2.4); added via `migrations/0002_add_admin_email.sql` (see SDD.md change log).
- `[AMENDED]` 2026-07-21 — **Dev-only fixture credential.** `seeds/sample-data.sql` seeds one Root admin row (`id` `root-dev`) for local/preview `/admin/login` testing and as the auth integration tests' known-good account: username `Root`, password `DevRoot!2026`, email `dev-root@example.com`. This is fixture data, not a secret — it's never used in production, where the real Root account is bootstrapped separately at deploy time via a one-time GitHub secret (`Manual-Setup-Guide.md` Phase H1/I1). Regenerate the hash with a fresh password via `workers/lib/password.ts`'s `hashPassword()` if this fixture ever needs to change.

### M6. Frontend + Backend — Admin CMS
The `/admin` SPA and its remaining authenticated endpoints (SDD §3.1, §4.3).
- Admin endpoints: animal CRUD + reorder + media upload/delete, `content/:key` edit (including the 3 new image-backed keys), `settings` update, admin user CRUD, audit log read. `[AMENDED]` 2026-07-22 — plus **gallery photo CRUD + reorder** (`/api/admin/gallery`), an approved scope addition: `gallery_photos` existed with a public `GET /api/gallery` since M2 but no admin management anywhere in the original scope.
- `DELETE /api/admin/animals/:id` is a soft delete: sets `deleted_at`, does not remove the row or its `animal_media` children. The client confirmation step (requirements §7.2.2) still applies before the request fires. Admin list views can offer a "show deleted" toggle to view/restore later if wanted, but that's not required for v1 — only the column and the filtering behavior are.
- Admin components: AdminLogin, AdminShell (nav + route guard), AnimalEditor (form + media manager), ContentEditor (in-place fields), SiteSettingsPanel, AdminUserManager, AuditLogView. `[AMENDED]` 2026-07-22 — plus **GalleryEditor** (gallery scope addition above), **AdminResetPassword** (`src/pages/admin/reset-password.astro` — the one `/admin/*` URL that's a real page, not an `AdminShell` view, since it's reached via an emailed link), and **AdminForcePasswordChange** (blocking view for the forced first-login password change, already backed by M5's `force_password_change` flag but never listed as a component to build).
- Audit logging middleware fires on every state-changing admin request (requirements §7.2.4).
- Root-account protections: cannot be deleted, cannot be permanently locked out, can force-reset another admin's password. `[AMENDED]` 2026-07-22 — plus: only Root can create/promote an account into the `root` role (Requirements §7.2.3/§15).
- A required migration beyond schema already covering M6 (`gallery_photos`/`admins`/`site_content` needed no new columns): **`migrations/0003_audit_log_admin_id_nullable.sql`** — `audit_log.admin_id` had no `ON DELETE` clause, so once real audit logging is live, deleting any admin with a logged action would hit a foreign-key violation. Made nullable with `ON DELETE SET NULL` instead.
- **Integration tests:** every admin endpoint, including audit-log entries being written on each mutation.
- **E2E tests, admin flow:** login → edit a text field → replace an image → add/edit/delete an animal → add/edit/delete a gallery photo → toggle a site setting.
- **Exit criteria:** an admin can fully manage content/animals/gallery/settings/other-admins locally, with every mutation reflected in the audit log.

### M7. Integrations — Media, Spam, Email
Wires the three external services into what M4/M5/M6 built, still against local/dev credentials.
- **R2 media:** client-side pre-resize before upload (`src/lib/imageResize.ts`); `POST /api/admin/animals/:id/media` and delete endpoint store real R2-backed URLs (local dev can use `wrangler r2` local simulation). `[AMENDED]` 2026-07-22 — no target dimension/quality was specified anywhere in the docs; implemented as a 2000px longest-edge cap, JPEG re-encode @ quality 0.85, except PNG inputs stay PNG (a mid-implementation correction: `site.logo_url` uploads are routinely transparent-background logos, and flattening to opaque JPEG would visibly break them against the footer's dark background). GIFs and video pass through unresized/untouched.
- **Turnstile:** widget added to the public contact form; `POST /api/contact` verifies the token server-side via Cloudflare's siteverify endpoint before anything else runs (test/sandbox keys locally — production keys come from B2 item 14). `[AMENDED]` 2026-07-22 — the site key reaches the frontend via Astro's `PUBLIC_TURNSTILE_SITE_KEY` build-time env var (`src/lib/turnstile.ts`), falling back to Cloudflare's published always-pass test sitekey (`1x00000000000000000000AA`) so local dev/E2E need zero setup.
- **Resend:** replaces M5's stubbed email calls for password-reset and new-admin-invite; contact-form inquiries emailed to the owner, including the selected animal's name if present. `[AMENDED]` 2026-07-22 — inquiries go to `OWNER_CONTACT_EMAIL` = `heather.a.johnston@gmail.com` (confirmed with the user; the publicly-displayed `hello@scatteredoaksfarms.com` couldn't be confirmed as actually forwarding anywhere), a plain `wrangler.toml [vars]` entry, not a secret.
- **Unit/integration tests:** Turnstile-token rejection path, contact-form-to-email pipeline, media upload validation (file type/size). `[AMENDED]` 2026-07-22 — "Resend call mocked in CI" is done via `vi.stubGlobal('fetch', ...)` (standard Vitest API), not `@cloudflare/vitest-pool-workers`'s advertised `fetchMock` — verified against the actually-installed `0.18.7` package that no such export exists from `cloudflare:test` (its real export list has no `fetchMock`); `vi.stubGlobal` works because test files and the imported `worker` module run in the same workerd isolate. Turnstile tests need no mocking at all — they hit the real siteverify endpoint with Cloudflare's published, permanent test secret keys (`1x0000...AA` always passes, `2x0000...AA` always fails).
- **Exit criteria:** contact form is spam-gated end-to-end; admin invite and password-reset emails render correctly (previewed via Resend's dev/test mode or a local email-capture tool) — email *delivery* itself can only be confirmed against real `RESEND_API_KEY`/`TURNSTILE_SECRET_KEY` values (not exercised in this implementation pass, which used placeholder/test credentials throughout); the full request/response pipeline (Turnstile verify → Resend API call → correct request shape) is fully tested and confirmed working.

### M8. Hardening & Full Test Suite
Close every remaining gap before this is CI/CD-eligible.
- Remaining E2E: full security flow (lockout, reset via emailed link, forced first-login change) end-to-end through the browser, not just API-level. `[AMENDED]` 2026-07-23 — building this surfaced a real gap, not just a testing one: there was no "Forgot password?" UI anywhere (`api.requestPasswordReset()` existed since M5/M7 but nothing called it). `AdminLogin.tsx` gained a login/forgot mode toggle before the flow could be driven through the browser at all. New `e2e/security-flow.spec.ts` (3 tests: lockout, reset-via-link, forced-first-login-change) uses a new `e2e/helpers/d1.ts` to shell out to `wrangler d1 execute --local` for setup/teardown (Playwright drives an external `wrangler dev` process with no `env.DB` binding), importing the real `workers/lib/password.ts`/`tokens.ts` hash functions directly rather than reimplementing them. Each test uses its own uniquely-suffixed throwaway admin instead of the shared seeded Root — `admin-flow.spec.ts` also logs in as Root and `playwright.config.ts` has `fullyParallel: true`, so mutating Root's lockout/password state would be a real race.
- Accessibility pass against WCAG 2.1 AA (automated axe-core scan + manual keyboard-nav check on modals/filters). `[AMENDED]` 2026-07-23 — new `e2e/accessibility.spec.ts` (`@axe-core/playwright`) scans `/`, the admin login screen, and the authenticated admin dashboard, asserting zero `impact: 'critical'` violations (matching this section's own exit-criteria wording). Found and fixed real gaps: missing `aria-label` on `AnimalEditor.tsx`/`GalleryEditor.tsx`'s icon-only reorder buttons, an empty `alt` on `AnimalEditor.tsx`'s per-animal media-management grid, and `AnimalCard.tsx`/`GallerySection.tsx`'s clickable divs only handling `Enter` (not `Space`) — manually verified via a real browser afterward (focus trap, Tab cycling, Escape, and the Space-key fix all confirmed working).
- Performance pass: confirm image lazy-loading below the fold, check first-contentful-paint locally against the §8.2 2-second target. `[AMENDED]` 2026-07-23 — `loading="lazy"` added to every below-the-fold `<img>` (public: About/AnimalCard/AnimalDetailModal/GallerySection/GalleryLightbox/Footer; admin: AnimalEditor/GalleryEditor/ContentEditor). New `e2e/performance.spec.ts` logs the real FCP via the Paint Timing API but asserts a generous 5000ms ceiling, not literally 2000ms — local `wrangler dev` has no CDN/edge caching/minification, so it isn't representative of the production experience §8.2 describes; true 2-second confirmation needs a real preview deployment (M9). Measured locally: ~500-1000ms, comfortably under even the real target.
- Coverage check: confirm the suite clears the 80% threshold that CI will enforce (SDD §8). `[AMENDED]` 2026-07-23 — required switching the coverage provider from V8 to **Istanbul** (see SDD.md §8's change log for why — V8 doesn't work inside the workerd runtime this project's integration tests run in). `@vitest/coverage-istanbul` added, `npm run test:coverage` script added, `vitest.config.ts`'s `coverage.include` scoped to `workers/**/*.ts` + the testable `src/lib/*.ts` files. Closed real gaps found along the way (not just excluded untestable code): new `workers/lib/r2.test.ts` (`extensionFor`'s fallback branches, zero prior coverage), new `src/lib/api.test.ts` (all `api.*` methods), oversized-file tests added to `adminGallery.test.ts`/`adminContent.test.ts`, a `galleryStyle` fallback test added to `settings.test.ts`. The one genuinely untestable function (`resizeImageFile`, needs a real browser canvas) is marked `istanbul ignore` with a comment pointing at the E2E test that verifies it instead. Final: 95%/86%/97%/98% (statements/branches/functions/lines), all above 80%.
- **Exit criteria:** `npm test` (unit+integration) and `npx playwright test` (e2e) both green locally, coverage ≥ 80%, no critical axe-core violations. **All met as of 2026-07-23** — 167 unit/integration tests, 11 E2E tests (3 new specs: security-flow, accessibility, performance), coverage above 80% on all four metrics, zero critical axe-core violations. `[AMENDED]` 2026-07-21 — `astro dev` auto-daemonizes into background mode in this dev environment, which breaks Playwright's `webServer` auto-launch (the spawned process exits immediately instead of blocking). `playwright.config.ts` has no `webServer` block as a result; start the dev server yourself first before running `npm run test:e2e`. Since M4, that means the full stack, not just the Astro shell: `npm run build && npx wrangler dev` (port 8787) — the visitor flow needs the real `/api/*` Worker, `astro dev` alone (port 4321) has no API. CI (M9) needs the equivalent: start `wrangler dev` (or the preview deployment) as an explicit step before the Playwright job, not rely on Playwright to launch it.

---

## Track B — Manual Cloud/GitHub Setup
Directly from SDD §10 — can start anytime, in this order, ahead of or alongside Track A. Only needs to be **complete** before M9. See `Manual-Setup-Guide.md` for the exact click-by-click version of B1–B3 below (it reorders these by dependency rather than by platform, and flags which sub-steps need M1's code to exist first).

- **B1. GitHub** — confirm repo is public; branch protection on `main`; create `preview`/`production` Environments; add Nate as required reviewer on `production`; add the four repo secrets (`CLOUDFLARE_API_TOKEN`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `ROOT_ADMIN_BOOTSTRAP_PASSWORD` — placeholder values fine until B2/B3 produce real ones); confirm Actions is enabled.
- **B2. Cloudflare** — create/confirm account; add `scattered-oaks-zebu.com` as a zone and repoint nameservers at the registrar; create a scoped API token; `wrangler d1 create` for both databases (record IDs into `wrangler.toml` from M1); create R2 buckets; create the Pages project connected to this repo; bind the custom domain; register the Turnstile widget (site key → M7's frontend, secret key → Worker secret); push `RESEND_API_KEY`/`TURNSTILE_SECRET_KEY` via `wrangler secret put`.
- **B3. Resend** — create account; add and verify the sending domain (SPF/DKIM/DMARC records added in Cloudflare DNS for the same zone); generate the API key and store it in both the GitHub secret (B1) and the Worker secret (B2).

**Exit criteria:** every row in SDD §9.1's secret/variable matrix has a real value in its real location; `wrangler d1 create` output IDs are in `wrangler.toml`; Pages project builds successfully against a "hello world" placeholder even before Track A code lands.

---

## Convergence

### M9. CI/CD Pipeline
Requires Track A (code + tests exist) and Track B (accounts/secrets exist).
- `.github/workflows/ci.yml`: `build-and-test` job (lint, format check, build, `test:coverage` — enforces the 80% gate — full Playwright E2E, every PR and push to `main`); `preview-deploy` job (preview Worker + preview D1 migrate/seed, PR-only); `deploy` job gated on the `production` Environment, depending on `build-and-test`.
- First PR through the full pipeline: verify the preview URL is real and clickable, verify the `production` job actually pauses for approval and doesn't deploy until clicked.
- **Exit criteria:** opening a PR produces a working preview site automatically; merging to `main` produces a pending, approval-gated production deployment.
- `[AMENDED]` 2026-07-23 — **Investigating M9 before writing any workflow file found production was already being deployed to, unreviewed, since M6.** Cloudflare Workers Builds' Git auto-deploy (Track B, Manual-Setup-Guide Phase E1) had been shipping every push to `main` straight to the live domain — confirmed via `wrangler deployments list` (a deployment timestamped to the exact moment of the M8 push), the live site (`curl .../api/animals` → `Internal Server Error`), and remote D1 (`wrangler d1 execute --remote` showed zero application tables — no migration had ever run against production). This meant the required-reviewer gate this section describes did not actually exist yet, despite M1–M8 all having shipped. **User decision: disabled Workers Builds' auto-deploy** (Manual-Setup-Guide Phase E1a) so `.github/workflows/ci.yml`'s `deploy` job, gated by the real `production` GitHub Environment, becomes the only path to production. Two more user decisions folded into the same build: (1) pushing `RESEND_API_KEY`/`TURNSTILE_SECRET_KEY` into the Worker (old Manual-Setup-Guide item H3) is automated into the `deploy` job from the GitHub secret values on every deploy, rather than a one-time manual `wrangler secret put`; (2) `PUBLIC_TURNSTILE_SITE_KEY` moved from a Workers-Builds build variable (which stopped running) to a plain GitHub Actions repository variable, read only by the production build step — the preview build deliberately omits it, relying on the existing always-pass dummy-sitekey fallback instead of needing to register every ephemeral preview URL as a Turnstile hostname. New `scripts/seed-root-admin.ts` (idempotent, run as a `deploy`-job step) creates the real production Root account from `ROOT_ADMIN_BOOTSTRAP_PASSWORD` — a design gap in every prior milestone, since nothing previously existed to actually create the account M11's login step assumes. See `SDD.md`'s M9 change-log entry and `Manual-Setup-Guide.md`'s Phase E1a/H3/F1 amendments for the full detail.

### M10. Content Migration
- Replace the 11 sample animals with the real herd of 38 (owner supplies data/photos per requirements §13). `[AMENDED]` 2026-07-21 — the Claude Design project's `uploads/` folder already has real photography for the 11 sample animals plus farm/lifestyle gallery shots and the real logo (see `design-reference/README.md`); pull those into R2 directly rather than assuming all photography is still outstanding. Only the remaining ~27 animals need new photos/data from the owner.
- Replace all placeholder site copy/photos with final farm content.
- Confirm gallery links to the farm's Facebook page.
- **Exit criteria:** production D1 (once seeded) reflects the real herd, not sample data.

### M11. Launch
- First production approval click; verify `scattered-oaks-zebu.com` resolves and serves the live site.
- Log in as Root with the bootstrap credential, change the password immediately, rotate the `ROOT_ADMIN_BOOTSTRAP_PASSWORD` GitHub secret (requirements §7.2.4, SDD §10 item 19).
- Confirm D1 backup/export schedule and R2 retention are in place (§8.6).
- **Exit criteria:** site is live at the production domain; Root credential has been rotated out of its bootstrap value; a backup schedule exists.

---

## Open decisions to make before they block a milestone

From Requirements §15 — none of these block M1–M8, but should be resolved by the milestone noted:

| Question | Resolve by | Note |
|---|---|---|
| Admin CMS at `/admin` path vs. separate subdomain | Already resolved | SDD §3.1 committed to `/admin` on the same domain — flagging in case the owner wants to revisit. |
| Retention/export policy for sold/removed animals | Resolved 2026-07-20 | **Soft delete.** `animals.deleted_at` (nullable timestamp) added beyond SDD §5.1; `DELETE /api/admin/animals/:id` sets it instead of removing the row; all public queries filter it out. Amends the SDD schema — noted here since the SDD itself is a static .docx. |
| More than two admin roles (read-only/limited editor) in the future | Post-launch | Out of scope for v1 per requirements §14; no action needed now. |
| Confirm Resend sending domain (e.g. `mail.scattered-oaks-zebu.com`) | B3 | Needed to actually verify the domain in Resend. |
| Can any Administrator grant the `root` role? | Resolved 2026-07-22 | **No — Root-only.** Requirements §7.2.3's literal text let any admin assign any role when managing other accounts; restricted to Root-only for granting/creating `root`-role accounts. See Requirements.md §7.2.3/§15. |

## Milestone → Requirements traceability

Each milestone maps back to the requirements/SDD sections it implements, so nothing above was invented — see SDD §11 Traceability Matrix for the authoritative mapping this plan follows.
