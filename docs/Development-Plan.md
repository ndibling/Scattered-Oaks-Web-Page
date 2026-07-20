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
Set up the Astro project, folder layout, and tooling — no backend logic yet.
- `npm create astro@latest`, add React/Preact integration for islands.
- Folder structure: `src/pages`, `src/components` (public), `src/admin` (admin islands), `src/lib` (shared client), `functions/` or `workers/` for the API, `migrations/` for D1 schema.
- Extract the Claude Design tokens (OKLCH colors, Quicksand/Nunito, spacing/radius) into a single shared tokens module (SDD §3.3) — this is the one file later design-iteration passes touch.
- `wrangler.toml` stub (bindings for D1/R2 left as placeholders — real IDs come from B2).
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
- **Integration tests:** each endpoint against local D1 via `@cloudflare/vitest-pool-workers`.
- **Exit criteria:** all five public endpoints return real data from the seeded local D1, verified by integration tests.

### M4. Frontend — Public Site
Pixel-faithful rebuild of the Claude Design prototype (requirements §6.4 step 4), wired to M3's live API instead of hardcoded content.
- Components: Header/Nav, Hero, About, AnimalGrid + FilterTabs, AnimalCard, AnimalDetailModal (photo/video carousel), Gallery + GalleryLightbox, ContactForm (Turnstile widget wired in M7), Footer.
- Fetch animals/gallery/content/settings from M3's API at build/request time (SDD §3.4) — confirms the "admin edit needs no redeploy" requirement holds architecturally, even before M6's editor exists.
- Responsive breakpoints, `clamp()` fluid type, WCAG 2.1 AA basics (contrast, alt text, keyboard nav on the lightbox and filter tabs) — requirements §8.3.
- SEO basics: meta tags, Open Graph, `sitemap.xml`, `robots.txt` (§8.4).
- **E2E tests (Playwright), visitor flow subset:** browse, apply each filter tab, open detail lightbox + carousel.
- **Exit criteria:** local dev site is visually/behaviorally indistinguishable from the Claude Design prototype, backed by live local data.

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

### M6. Frontend + Backend — Admin CMS
The `/admin` SPA and its remaining authenticated endpoints (SDD §3.1, §4.3).
- Admin endpoints: animal CRUD + reorder + media upload/delete, `content/:key` edit, `settings` update, admin user CRUD, audit log read.
- `DELETE /api/admin/animals/:id` is a soft delete: sets `deleted_at`, does not remove the row or its `animal_media` children. The client confirmation step (requirements §7.2.2) still applies before the request fires. Admin list views can offer a "show deleted" toggle to view/restore later if wanted, but that's not required for v1 — only the column and the filtering behavior are.
- Admin components: AdminLogin, AdminShell (nav + route guard), AnimalEditor (form + media manager), ContentEditor (in-place fields), SiteSettingsPanel, AdminUserManager, AuditLogView.
- Audit logging middleware fires on every state-changing admin request (requirements §7.2.4).
- Root-account protections: cannot be deleted, cannot be permanently locked out, can force-reset another admin's password.
- **Integration tests:** every admin endpoint, including audit-log entries being written on each mutation.
- **E2E tests, admin flow:** login → edit a text field → replace an image → add/edit/delete an animal → toggle a site setting.
- **Exit criteria:** an admin can fully manage content/animals/settings/other-admins locally, with every mutation reflected in the audit log.

### M7. Integrations — Media, Spam, Email
Wires the three external services into what M4/M5/M6 built, still against local/dev credentials.
- **R2 media:** client-side pre-resize before upload; `POST /api/admin/animals/:id/media` and delete endpoint store real R2-backed URLs (local dev can use `wrangler r2` local simulation).
- **Turnstile:** widget added to the public contact form; `POST /api/contact` verifies the token server-side via Cloudflare's siteverify endpoint before anything else runs (test/sandbox keys locally — production keys come from B2 item 14).
- **Resend:** replaces M5's stubbed email calls for password-reset and new-admin-invite; contact-form inquiries emailed to the owner, including the selected animal's name if present.
- **Unit/integration tests:** Turnstile-token rejection path, contact-form-to-email pipeline (Resend call mocked in CI), media upload validation (file type/size).
- **Exit criteria:** contact form is spam-gated end-to-end; admin invite and password-reset emails render correctly (previewed via Resend's dev/test mode or a local email-capture tool).

### M8. Hardening & Full Test Suite
Close every remaining gap before this is CI/CD-eligible.
- Remaining E2E: full security flow (lockout, reset via emailed link, forced first-login change) end-to-end through the browser, not just API-level.
- Accessibility pass against WCAG 2.1 AA (automated axe-core scan + manual keyboard-nav check on modals/filters).
- Performance pass: confirm image lazy-loading below the fold, check first-contentful-paint locally against the §8.2 2-second target.
- Coverage check: confirm the suite clears the 80% threshold that CI will enforce (SDD §8).
- **Exit criteria:** `npm test` (unit+integration) and `npx playwright test` (e2e) both green locally, coverage ≥ 80%, no critical axe-core violations.

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
- `.github/workflows/ci.yml`: `build-and-test` job (lint, unit, integration — every PR and push to `main`); `preview-deploy` job (Pages preview + preview Worker/D1, PR-only); `deploy` job gated on the `production` Environment, depending on `build-and-test`.
- First PR through the full pipeline: verify the preview URL is real and clickable, verify the `production` job actually pauses for approval and doesn't deploy until clicked.
- **Exit criteria:** opening a PR produces a working preview site automatically; merging to `main` produces a pending, approval-gated production deployment.

### M10. Content Migration
- Replace the 11 sample animals with the real herd of 38 (owner supplies data/photos per requirements §13).
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

## Milestone → Requirements traceability

Each milestone maps back to the requirements/SDD sections it implements, so nothing above was invented — see SDD §11 Traceability Matrix for the authoritative mapping this plan follows.
