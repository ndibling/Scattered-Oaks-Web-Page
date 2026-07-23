# Scattered Oaks Farms — Software Design Description (SDD)

**Version 1.8 (living document)** — originally authored as Version 1.0, July 19, 2026, as a Word document (`Scattered Oaks Farm Software Design Description.docx`, preserved in this folder as the frozen v1 baseline). This Markdown version is the living source of truth going forward: it is updated whenever implementation changes the actual design, per the workflow in `Development-Plan.md`.

This document describes the technical design of the Scattered Oaks Farms website, implementing the requirements defined in `Requirements.md` (formerly "Scattered Oaks Farms Website Requirements Specification" v2.1). It carries forward that document's provenance tags `[PDF]` / `[DESIGN]` / `[ADDED]` where a design decision traces directly to a specific requirement, and uses `[MANUAL SETUP]` for any one-time configuration step a human must perform by hand in GitHub, Cloudflare, or Resend — none of this can be scripted by CI on a brand-new account. Every `[MANUAL SETUP]` item also appears, in executable checklist form, in Section 10. `[AMENDED]` marks a design change made after implementation began (see change log at the bottom).

## Table of Contents
1. [Introduction](#1-introduction)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Frontend Design](#3-frontend-design)
4. [Backend / API Design](#4-backend--api-design)
5. [Data Design](#5-data-design)
6. [Security Design](#6-security-design)
7. [CI/CD Pipeline Design](#7-cicd-pipeline-design)
8. [Testing Strategy Design](#8-testing-strategy-design)
9. [Deployment & Infrastructure Design](#9-deployment--infrastructure-design)
10. [Manual Configuration Checklist](#10-manual-configuration-checklist)
11. [Traceability Matrix](#11-traceability-matrix)
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: Diagram Index](#appendix-b-diagram-index)
- [Change Log](#change-log)

## 1. Introduction

### 1.1 Purpose
This Software Design Description (SDD) specifies how the Scattered Oaks Farms website will be built: concrete architecture, frontend/backend component design, data model, API contracts, security design, CI/CD pipeline, and testing strategy. It is the design-level counterpart to the requirements document — the requirements say what the system must do; this document says how.

### 1.2 Scope
Covers the public marketing/animal-listing site, the Administrator CMS, the Cloudflare-native backend, the GitHub/Cloudflare CI-CD pipeline with its approval gate, and the manual one-time setup required on GitHub, Cloudflare, and Resend before the pipeline can run end to end.

### 1.3 References
- Scattered Oaks Farms Website Requirements Specification (`Requirements.md`, formerly v2.1 Word document).
- Claude Design project "Scattered Oaks Farms website design," project ID `a8493b50-0e7e-46e9-a0ef-930263d1a0c8`, file `Scattered Oaks Farms.dc.html`.
- `Development-Plan.md` — the build-sequencing counterpart to this document.

### 1.4 Acronyms & Definitions

| Term | Meaning |
|---|---|
| SDD | Software Design Description — this document. |
| DBA | "Doing Business As" — Scattered Oaks Farms operates as a DBA of Heather Johnston. |
| IMZA | International Miniature Zebu Association — the breed registry issuing an animal's registration number. |
| D1 | Cloudflare's managed, serverless SQLite-compatible database product. |
| R2 | Cloudflare's S3-compatible object storage product, used here for images/video. |
| Workers | Cloudflare's serverless compute platform, used here for the API/backend. |
| Turnstile | Cloudflare's free CAPTCHA alternative for bot/spam protection. |
| Wrangler | Cloudflare's CLI/deploy tool for Workers and Pages, used in the CI pipeline. |
| PBKDF2 | Password-Based Key Derivation Function 2 — the password-hashing algorithm used, via the Workers-native WebCrypto API. |
| ER diagram | Entity-Relationship diagram — visualizes database tables and how they relate. |
| SPA | Single-Page Application — used here to describe the client-rendered `/admin` section. |
| CI/CD | Continuous Integration / Continuous Deployment — the automated build-test-deploy pipeline. |

## 2. System Architecture Overview

*Figure 1 — System architecture / context diagram.*

The entire system runs on Cloudflare, deployed from a single GitHub repository, per the owner's constraint that everything live on one platform with no separate hosting bill. `[PDF]`

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Astro + React/Preact islands | Static-first site generation with small hydrated interactive components (filters, lightboxes, contact form, admin app). |
| Hosting / CDN / API / Compute | Cloudflare Workers (with static assets) `[AMENDED]` | A single Worker (`scattered-oaks-farms`) serves both the static frontend build and the API — authentication, animal/content/settings CRUD, contact form, uploads — behind the global edge CDN, with automatic per-PR preview deployments via Workers Builds. Superseded the original separate-Pages-product design; see §2.2 and the change log. |
| Database | Cloudflare D1 | SQLite-compatible relational storage for all structured data. |
| Object Storage | Cloudflare R2 | Animal photo/video storage. |
| Bot Protection | Cloudflare Turnstile | Blocks automated spam on the public contact form. |
| Transactional Email | Resend | Password-reset and new-admin-invite emails. |
| CI/CD | GitHub Actions + Wrangler CLI | Build, test, and deploy pipeline. |
| Version Control | GitHub | Source repository, pull-request review, Environments approval gate. |
| Testing | Vitest (+ `@cloudflare/vitest-pool-workers`), Playwright | Unit/integration tests against the real Workers runtime; end-to-end browser tests. |

### 2.2 Environment Topology
`[AMENDED]` 2026-07-21 — one Worker project (`scattered-oaks-farms`), not two separate Pages/Workers products; preview vs. production is a `wrangler.toml` named-environment distinction (`--env preview` / default), each bound to its own already-provisioned D1 database and R2 bucket. See the change log for why.

| Environment | Trigger | Targets |
|---|---|---|
| `preview` | Every pull request | Preview deployment of the `scattered-oaks-farms` Worker (static assets + API), bound to the preview D1 database (`scattered-oaks-db-preview`) and preview R2 bucket (`scattered-oaks-media-preview`), seeded with sample data. |
| `production` | Merge to `main`, gated by required-reviewer approval | Production deployment of the `scattered-oaks-farms` Worker, bound to the production D1 database (`scattered-oaks-db`) and production R2 bucket (`scattered-oaks-media`), bound to `scattered-oaks-zebu.com`. |

## 3. Frontend Design
Astro is used as the site generator: pages are static HTML by default (fast, SEO-friendly per requirements §8.4) with only the interactive pieces — filter tabs, the animal/gallery lightboxes, the contact form, and the entire `/admin` app — hydrated as small React/Preact "islands." This keeps the public site's shipped JavaScript minimal while still supporting the fully dynamic Administrator experience.

### 3.1 Route Map

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Public single-page site: Hero, About, Available Animals, Gallery, Contact (anchor-navigated, matching the approved design). | Static shell (meta tags, fonts) + one hydrated island rendering the entire visible page. `[AMENDED]` 2026-07-21 — see §3.4. |
| `/admin` | Admin app: login, dashboard, animals, content, gallery, settings, users — all logical views inside one hydrated island (`AdminShell`), not distinct server-routable URLs. | Static shell + one hydrated island, same pattern as `/` (§3.4). `[AMENDED]` 2026-07-22 — see below. |
| `/admin/reset-password` | Set a new password from an emailed reset link. | Hydrated island; public route, but requires a valid token in the URL. This is the one `/admin/*` URL that **is** a real, separately-loadable page — it's reached from an email client, not in-app navigation, so it can't rely on `AdminShell`'s client-side view state already being loaded. |

`[AMENDED]` 2026-07-22 (M6) — the original route map listed `/admin/login`, `/admin`, `/admin/animals`, `/admin/content`, `/admin/settings`, `/admin/users` as six distinct rows/URLs. Implemented instead as one page (`/admin`) whose `AdminShell` island manages all of those as internal view state (`dashboard | animals | content | gallery | settings | users`), exactly mirroring how `/`'s five sections were never separate URLs either (§3.4). No router library exists or is needed in this project's deliberately minimal dependency stack; nothing in Requirements.md mandates admin deep-linking/bookmarking. `/admin/reset-password` is the sole exception, for the reason given above.

### 3.2 Component Breakdown
Public site components (visual/behavioral spec sourced from the Claude Design prototype): `[DESIGN]`
- Header/Nav, Hero, About, AnimalGrid + FilterTabs, AnimalCard, AnimalDetailModal (photo/video carousel), Gallery + GalleryLightbox, ContactForm, Footer — one-to-one with the sections cataloged in requirements §6.2.

Administrator components (new; not present in the public-only design prototype): `[ADDED]`
- AdminLogin, AdminShell (nav + auth guard), AnimalEditor (create/edit form + media manager), ContentEditor (in-place text fields), SiteSettingsPanel, AdminUserManager, AuditLogView.
- **GalleryEditor, AdminResetPassword, AdminForcePasswordChange.** `[ADDED]` 2026-07-22 (M6) — GalleryEditor manages `gallery_photos` (add/edit/delete/reorder), an approved scope addition since that table existed with a public `GET /api/gallery` but no admin management anywhere in the original design. AdminResetPassword and AdminForcePasswordChange were both implied by already-built M5 backend behavior (the reset-password flow and `force_password_change`) but never listed as components to build.
- **AdminLogin gained a "Forgot password?" mode.** `[AMENDED]` 2026-07-23 (M8) — `api.requestPasswordReset()` and its backend (`POST /api/auth/forgot-password`) existed since M5/M7, but nothing in the UI ever called it; the reset-password flow (§6.3) had no entry point from the browser. AdminLogin now toggles between its existing login form and a minimal email-only "send reset link" form, discovered as a real gap (not just a testing gap) while building M8's full-security-flow E2E coverage.

### 3.3 Shared Design Tokens
A single tokens module (colors as OKLCH values, the Quicksand/Nunito font stack, spacing and radius conventions) is extracted directly from the Claude Design source and imported by every component, public or admin. This is the one place a future Design Iteration Workflow update (requirements §6.4) needs to touch to restyle the whole site consistently. `[DESIGN]`

### 3.4 Data Fetching
Public pages and the admin app call the Workers API for animals, gallery photos, site text, and settings — nothing is hardcoded at build time. This means an Administrator's edit appears on the live site immediately, with no rebuild/redeploy required. `[ADDED]`

`[AMENDED]` 2026-07-21 — §3's "static HTML by default... only the interactive pieces hydrated as islands" and this section's "nothing is hardcoded at build time" are in real tension for a pure Astro static build: build-time data fetching (top-level `await` in `.astro` frontmatter) would satisfy "static HTML" but bake in whatever content existed at the last deploy, breaking "edits appear without redeploy." Resolved during M4 implementation in favor of the no-redeploy requirement, since that's the more specific and more frequently-stated one (Requirements §3.4, §7.2.1): the entire visible `/` page is one hydrated Preact island (`PublicSite`, mounted `client:load`) that fetches `/api/animals`, `/api/gallery`, `/api/content`, `/api/settings` in parallel on mount and renders everything from that response — directly porting the design prototype's own single-component structure (one `Component` class managing all state via `renderVals()`). Astro's build-time-static part is reduced to the document shell: `<head>` meta tags, Open Graph, font preconnect links, and a loading-skeleton fallback shown until the fetch resolves. This trades away some of the "minimal shipped JS"/pre-rendered-content SEO benefit static generation would otherwise give — acceptable here since Requirements §8.4's SEO needs (page title/description/Open Graph/sitemap/robots.txt) are about the page's own metadata, not about individual animal listings being crawler-indexed, and can stay static regardless of this decision.

## 4. Backend / API Design
The Workers API is organized into route modules — auth, animals, gallery, content, settings, media, admin animals, admin gallery, admin content, admin settings, admin users, admin audit, contact — behind a small router, with shared middleware for session authentication and audit logging on any state-changing admin request (there is no generic rate-limit middleware — see §6.3a). `[AMENDED]` 2026-07-21 — "gallery" was missing from this list (see §5.2a's change log entry, same root cause: the gallery feature was underspecified in the original SDD). `[AMENDED]` 2026-07-22 (M6) — replaced the placeholder "admins, uploads" with the actual M6 module split (one file per admin resource, plus the public `media` module that serves R2 objects); "contact" remains M7 scope.

The router is built on [Hono](https://hono.dev/) — the de facto standard for this on Cloudflare Workers, with first-class TypeScript support and lightweight middleware composition, matching this section's "small router, with shared middleware" design intent. `[ADDED]` 2026-07-21, chosen during M3 implementation; no framework was specified in the original SDD.

### 4.1 Public Endpoints

| Method & Path | Auth | Notes |
|---|---|---|
| `GET /api/animals` | None | List animals; optional `?status=` filter matching the design's filter tabs. Excludes soft-deleted animals (`deleted_at IS NULL`). Each row includes `primary_image_url` (first ordered `animal_media` row) so the card grid has a thumbnail without an N+1 fetch per card — added during M4 when the frontend needed it; the full ordered `media` array stays on the detail endpoint only. `[AMENDED]` |
| `GET /api/animals/:id` | None | Full animal detail incl. ordered media, for the detail lightbox. Excludes soft-deleted animals. `[AMENDED]` |
| `GET /api/gallery` | None | Gallery photo list with captions. |
| `GET /api/content` | None | Current editable site text, keyed by field. |
| `GET /api/settings` | None | Public settings: `showPublicPrices`, `galleryStyle`. |
| `POST /api/contact` | None + Turnstile token required | Inquiry submission (name, email, message, optional animalId); verifies Turnstile server-side, then sends email via Resend. |
| `GET /media/*` | None | `[ADDED]` 2026-07-22 (M6) — serves R2 objects (uploaded animal media, gallery photos, content images) through this same Worker. No public R2 domain is configured anywhere in this project's Cloudflare setup (§10.2), so uploads are served this way instead — keeps local `wrangler dev`/CI self-contained and matches §2.1's "one Worker project" decision. Mounted at `/media`, not `/api/media`, matching the shape of the pre-existing static `/uploads/...` placeholder paths so `<img src>` code never has to branch between the two. |

### 4.2 Authentication Endpoints

| Method & Path | Auth | Notes |
|---|---|---|
| `POST /api/auth/login` | None | Validates credentials; increments/resets failed-attempt counter; issues session cookie on success. |
| `POST /api/auth/logout` | Session | Invalidates the current session token in D1. |
| `POST /api/auth/forgot-password` | None | Generic response regardless of whether the account exists (avoids user enumeration); emails a reset link if it does. |
| `POST /api/auth/reset-password` | Valid reset token | Sets a new password, invalidates the token and all existing sessions for that account. |
| `POST /api/auth/change-password` | Session | Used for voluntary changes and the forced first-login change for new admins. |
| `GET /api/auth/me` | Session | `[ADDED]` 2026-07-22 (M6) — returns the current admin (`{id, username, role}`) or 401. No session-check endpoint existed anywhere in the original design; `AdminShell`'s route guard needs one to distinguish "not logged in" from "still loading" on mount. |

### 4.3 Administrator Endpoints

| Method & Path | Auth | Notes |
|---|---|---|
| `POST /api/admin/animals` | Session | Create an animal record. |
| `PUT /api/admin/animals/:id` | Session | Update an animal record. |
| `DELETE /api/admin/animals/:id` | Session | **Soft delete** — sets `deleted_at`, does not remove the row or its media (client confirms first). `[AMENDED]` |
| `PUT /api/admin/animals/reorder` | Session | Persist new display order for the herd grid. |
| `POST /api/admin/animals/:id/media` | Session | Upload a photo/video to R2. `[AMENDED]` 2026-07-22 — client-side pre-resize before upload is §7.1/M7 scope (see Development-Plan.md), not M6; M6 does a basic size-limited upload only (10MB image / 100MB video). |
| `DELETE /api/admin/animals/:id/media/:mediaId` | Session | Remove one photo/video. |
| `POST /api/admin/gallery` | Session | `[ADDED]` 2026-07-22 (M6) — create a gallery photo (multipart upload + label/description). |
| `PUT /api/admin/gallery/:id` | Session | `[ADDED]` 2026-07-22 — metadata only (label/description/order); no file-replace endpoint, mirroring `animal_media`'s add/delete-only asymmetry — replacing a photo's image is delete-then-recreate. |
| `DELETE /api/admin/gallery/:id` | Session | `[ADDED]` 2026-07-22. |
| `PUT /api/admin/gallery/reorder` | Session | `[ADDED]` 2026-07-22 — same shape as `PUT /api/admin/animals/reorder`. |
| `PUT /api/admin/content/:key` | Session | Edit one site text field in place (no style/placement change), or replace an image-backed key (`site.logo_url`, `hero.photo_url`, `about.photo_url` — see §5.4) via multipart upload. 404s for a key that isn't already seeded, rather than silently creating an orphan row. |
| `PUT /api/admin/settings` | Session | Update `showPublicPrices` / `galleryStyle`. Partial — only provided keys are written. |
| `GET /api/admin/users` | Session | List Administrator accounts. |
| `POST /api/admin/users` | Session | Create an Administrator; auto-generates a temp password, emails it, sets `force_password_change`. `[AMENDED]` 2026-07-22 — creating (or promoting) an account into the `root` role requires the actor to already be Root (403 otherwise); see §7.2.3's amendment in Requirements.md. |
| `PUT /api/admin/users/:id` | Session | Edit email/role; Root can directly set another admin's password as a last resort (403 for a non-root actor). `[AMENDED]` 2026-07-22 — same Root-only role-grant restriction as create. |
| `DELETE /api/admin/users/:id` | Session | Delete an Administrator. 403 if the **target** account's role is `root` (Requirements §7.2.3 — Root cannot be deleted). |
| `GET /api/admin/audit` | Session | Recent audit-log entries, `?limit=&offset=`, newest first. |

`[ADDED]` 2026-07-22 — the two Root-only 403s above are this codebase's first use of HTTP 403 (previously only 401/423/400/404 were used). There's no generic `requireRole` middleware: every Root-related check depends on request-body content or the *target* row rather than being a blanket "whole route is Root-only" rule, so both are small inline checks inside `workers/routes/adminUsers.ts`'s handlers, matching this API's existing inline-validation style.

## 5. Data Design

*Figure 2 — D1 entity-relationship diagram.*

### 5.1 animals

| Column | Type | Notes |
|---|---|---|
| id | TEXT (UUID) | Primary key. |
| name / barn_name | TEXT | Public display name. |
| registered_name | TEXT, nullable | Official registered name. |
| type, sex | TEXT | Cow / Bull / Calf, etc., matching the design's categories. |
| age_text | TEXT | Free-text age or date of birth. |
| status | TEXT (enum) | for-sale / pending / coming-soon / not-for-sale. |
| price_cents | INTEGER, nullable | Null when not for sale. |
| description | TEXT | Marketing blurb. |
| imza_number, expected_height | TEXT, nullable | Registration detail fields. |
| sire_registered_name, dam_registered_name | TEXT, nullable | Parent registration detail. |
| display_order | INTEGER | Manual sort position in the herd grid. |
| **deleted_at** | **TIMESTAMP, nullable** | **`[AMENDED]` 2026-07-20 — set on delete instead of removing the row (soft delete). All public queries filter `WHERE deleted_at IS NULL`.** |
| created_at, updated_at | TIMESTAMP | Audit timestamps. |

### 5.2 animal_media

| Column | Type | Notes |
|---|---|---|
| id | TEXT (UUID) | Primary key. |
| animal_id | TEXT | Foreign key → `animals.id`. |
| media_type | TEXT | `image` or `video`. |
| url | TEXT | R2-backed URL. |
| display_order | INTEGER | Carousel order. |

### 5.2a gallery_photos
`[AMENDED]` 2026-07-21 — this table was missing from the original data design despite `GET /api/gallery` (§4.1) and the design prototype's 9-item captioned gallery grid needing somewhere to live. Added during M2 implementation; see the change log.

| Column | Type | Notes |
|---|---|---|
| id | TEXT (UUID) | Primary key. |
| url | TEXT | R2-backed URL. |
| label | TEXT | Short caption shown on the gallery tile and in the lightbox title. |
| description | TEXT, nullable | Longer caption shown in the gallery lightbox. |
| display_order | INTEGER | Grid position. |
| created_at, updated_at | TIMESTAMP | Audit timestamps. |

### 5.3 admins

| Column | Type | Notes |
|---|---|---|
| id | TEXT (UUID) | Primary key. |
| username | TEXT, unique | e.g. "Root". |
| **email** | **TEXT, unique** | **`[AMENDED]` 2026-07-21 — missing from the original design despite password-reset and new-admin-invite emails (§6.3, §4.3's `POST /api/admin/users`) needing somewhere to send to. Added via `migrations/0002_add_admin_email.sql`.** |
| password_hash, password_salt | TEXT | PBKDF2-SHA256 hash and per-user salt — see §6. |
| role | TEXT | `root` or `admin`. |
| force_password_change | BOOLEAN | Set on temp-password accounts; cleared after first change. |
| failed_login_count, locked_until | INTEGER, TIMESTAMP nullable | Lockout tracking (3-attempt policy). |
| created_at, last_login_at | TIMESTAMP | Audit timestamps. |

### 5.4 sessions, password_reset_tokens, site_content, site_settings, audit_log
- **sessions** — `token` (hashed, PK), `admin_id` (FK), `created_at`, `expires_at`. Backs session-cookie lookups and lets logout/revocation take effect immediately.
- **password_reset_tokens** — `token` (hashed, PK), `admin_id` (FK), `expires_at`, `used_at` (nullable). Single-use, time-limited.
- **site_content** — `key` (TEXT, PK), `value_text`, `updated_at`, `updated_by` (FK admins). One row per editable text field on the public site. `[ADDED]` 2026-07-22 (M6) — three keys are image-backed rather than text (`site.logo_url`, `hero.photo_url`, `about.photo_url`), holding an R2-served or placeholder URL string. These existed as hardcoded `<img src>` paths in `Hero.tsx`/`Header.tsx`/`Footer.tsx`/`About.tsx` (M4) with no backing data at all — `site.logo_url` is shared by both `Header.tsx` and `Footer.tsx` — Requirements §7.2.1's "replace any image (hero, About, logo)" had nothing to attach to until these were added. `PUT /api/admin/content/:key` (§4.3) branches on request content-type to handle these as file uploads.
- **site_settings** — `key` (TEXT, PK), `value`. Backs `showPublicPrices` and `galleryStyle`. `[DESIGN]`
- **audit_log** — `id` (PK), `admin_id` (FK, actor), `action`, `target_type`, `target_id`, `summary`, `created_at`. Backs requirements §7.2.4's audit-log requirement. `[ADDED]` **`[AMENDED]` 2026-07-22 (M6, `migrations/0003_audit_log_admin_id_nullable.sql`) — `admin_id` is now nullable with `ON DELETE SET NULL` (was `NOT NULL` with no `ON DELETE` clause, i.e. implicit `RESTRICT`). Real audit logging makes almost every admin have at least one logged action, so `DELETE /api/admin/users/:id` on any such admin would otherwise fail with a foreign-key violation — the exact feature M6 builds. Preserving audit history after the actor's account is deleted is also the correct behavior for an accountability log, not just a workaround; `GET /api/admin/audit` returns a null actor for such rows (`LEFT JOIN admins`), which `AuditLogView` renders as "deleted administrator."**

## 6. Security Design

### 6.1 Password Hashing
Passwords are hashed with PBKDF2-SHA256 (100,000 iterations, per-user random salt) using the Workers runtime's native WebCrypto SubtleCrypto API — chosen specifically because it needs no external native or WASM dependency (unlike bcrypt/argon2 libraries, which are awkward or unavailable in the Workers runtime), while still meeting modern password-storage guidance. `[ADDED]`

### 6.2 Login & Session Sequence
1. Client submits username/password to `POST /api/auth/login`.
2. Worker looks up the admin by username; if `locked_until` is in the future, rejects immediately with a generic lockout message.
3. Worker derives the PBKDF2 hash of the submitted password with the stored salt and compares to `password_hash`.
4. On mismatch: increments `failed_login_count`; on the 3rd consecutive failure, sets `locked_until` and stops.
5. On match: resets `failed_login_count` to 0, generates a random 256-bit session token, stores it (hashed) in `sessions` with a 24-hour expiry (`SESSION_DURATION_MS`), and returns it as an httpOnly, Secure, SameSite=Strict cookie.
6. If `force_password_change` is set (new admin, first login), the client is redirected to the change-password screen before anything else is accessible.

This sequence implements requirements §7.2.4 in full: 3-attempt lockout, forced first-login change for new admins, no password expiration. `[PDF]`

`[AMENDED]` 2026-07-21 — an unknown username still runs a full PBKDF2 derivation against a fixed dummy hash/salt (`workers/lib/password.ts`'s `DUMMY_HASH_SALT`) before returning the generic error, so login's response time for a nonexistent account doesn't measurably differ from a real one — otherwise the timing difference (skip-hashing vs. hash-then-compare) would itself leak which usernames exist, undermining the account-lockout message's deliberate vagueness. Decided during M5 implementation.

### 6.3 Forgot / Reset Password Sequence
1. User submits their email address to `POST /api/auth/forgot-password`; the response is identical whether or not the account exists, to avoid revealing valid accounts. `[AMENDED]` 2026-07-21 — the original text said "an identifier"; concretely, this is the `admins.email` column (§5.3), not username, since username isn't guaranteed private the way an email address is.
2. If the account exists, the Worker creates a single-use `password_reset_tokens` row, valid for 1 hour (`RESET_TOKEN_DURATION_MS`), and emails a reset link (containing the raw token) via Resend. `[AMENDED]` M5 implements this against a stub — real Resend wiring is M7.
3. The link opens `/admin/reset-password?token=...`; the client submits a new password to `POST /api/auth/reset-password`.
4. The Worker verifies the token is valid/unused/unexpired, validates the new password against the policy (§policy — 8+ chars, one number, one lowercase, one uppercase, one special character, per requirements §7.2.4), sets the new password hash, marks the token used, and invalidates all existing sessions for that account.
5. As a last resort, Root can directly set another admin's password via `PUT /api/admin/users/:id` without the email flow.

### 6.3a Rate Limiting Without a Separate Limiter
`[AMENDED]` 2026-07-21 — requirements §8.1 calls for rate limiting on login and forgot-password, but no KV or Durable Object binding exists in this project (§2's architecture), and adding one just for this would be more infrastructure than the problem needs. Decided during M5 implementation to reuse data these endpoints already require instead of building a separate limiter:
- **Login** is throttled by the existing account-lockout counter (§6.2): 3 consecutive failed attempts locks the account for 15 minutes (`LOCKOUT_DURATION_MS`) before another attempt is even checked against the password.
- **Forgot-password** is throttled per-account by `password_reset_tokens` itself: a request within 5 minutes (`FORGOT_PASSWORD_COOLDOWN_MS`) of an existing unused, unexpired token for the same account is a silent no-op — still returns the same generic response (§6.3 step 1), but doesn't create a second token or send a second email. Since the table has no `created_at` column, "created within the cooldown window" is inferred from `expires_at` (every token's `expires_at` = its creation time + `RESET_TOKEN_DURATION_MS`).

A separate IP-based limiter (e.g. a Cloudflare Rate Limiting Rule at the edge) remains a reasonable future addition but isn't required for the per-account guarantees above.

### 6.4 Contact-Form Spam Protection
The public contact form renders a Cloudflare Turnstile widget; the client includes the resulting token in its `POST /api/contact` body. The Worker verifies that token server-side against Cloudflare's siteverify endpoint using the Turnstile secret key before processing the inquiry or sending any email — a request with a missing or failed token is rejected before it ever reaches Resend. `[ADDED]`

### 6.5 Secrets Inventory

| Secret | Purpose | Stored As |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Lets GitHub Actions deploy via Wrangler. | GitHub Actions repository secret. |
| `RESEND_API_KEY` | Send transactional email from the Worker. | Cloudflare Worker secret (set once via `wrangler secret put` — see §10). |
| `TURNSTILE_SECRET_KEY` | Server-side verification of Turnstile tokens. | Cloudflare Worker secret. |
| `ROOT_ADMIN_BOOTSTRAP_PASSWORD` | One-time seed value for the initial Root account. | GitHub Actions secret, consumed once by a seed step, then rotated by Root from the admin UI (see §10, item 19). |

No secret or credential value is ever committed to the repository or printed in project documentation — consistent with the handling of the exposed root password in the original requirements PDF. `[ADDED]`

`[ADDED]` 2026-07-22 (M7) — `OWNER_CONTACT_EMAIL` (destination address for contact-form inquiries) is **not** in the secrets table above: it's a plain `wrangler.toml [vars]` entry (`heather.a.johnston@gmail.com`, both environments), not a secret. Sent directly rather than to the publicly-displayed `hello@scatteredoaksfarms.com` (seeded in `site.dba_line`), since whether that address forwards to a real checked inbox couldn't be confirmed during implementation — easy to repoint later by editing one `wrangler.toml` value if forwarding is set up.

## 7. CI/CD Pipeline Design

*Figure 3 — CI/CD pipeline with the required-reviewer production approval gate.*

Implements requirements §11.1 (Deployment Approval Gate) and ties directly into the §6.4 Design Iteration Workflow's final step. `[PDF]`

### 7.1 Pipeline Stages
1. Pull request opened against `main` → GitHub Actions runs lint, unit, and integration tests.
2. On success, CI deploys a PREVIEW build: a preview deployment of the `scattered-oaks-farms` Worker (static assets + API), bound to the preview D1/R2 environment, so the owner can click through a real, working site before approving anything. `[AMENDED]`
3. Merge to `main` → CI re-runs the full test suite, then the production-deploy job targets the GitHub "production" Environment.
4. The "production" Environment has the owner (Nate) configured as a required reviewer (see §10, item 4) — the job pauses until he clicks "Approve and deploy" in the GitHub Actions UI or mobile app. `[MANUAL SETUP]`
5. Once approved, CI runs `wrangler deploy` for the production environment, which applies any pending D1 migrations and publishes the Worker (static assets + API) bound to `scattered-oaks-zebu.com`. `[AMENDED]`

### 7.2 Workflow File Structure
A single `.github/workflows/ci.yml` with two jobs: `build-and-test` (runs on every PR and push to `main`) and `deploy`, gated by `environment: production` and depending on `build-and-test`.

A separate `preview-deploy` job (or step within `build-and-test`) runs only on `pull_request` events, publishing to the preview environment described in §2.2.

`[AMENDED]` 2026-07-23 (M9) — **This section's design was never actually the live behavior before M9.** Investigating M9 found that Cloudflare Workers Builds' "Connect to Git" integration (set up in Track B, `Manual-Setup-Guide.md` Phase E1) had been auto-deploying straight to production on every push to `main` since M6 — confirmed via `wrangler deployments list` (a deployment landed at the exact moment each milestone was pushed) and the live site itself (`/api/*` returning 500, since production D1 had zero migrations applied — Workers Builds deploys code, it doesn't run `wrangler d1 migrations apply`). This bypassed the required-reviewer gate in step 4 entirely; there was, in practice, no approval gate. **Fixed as part of M9:** Workers Builds' auto-deploy-on-push is disabled (`Manual-Setup-Guide.md` Phase E1a); the Worker project stays connected to GitHub only for the custom-domain binding (§9, item 13). `.github/workflows/ci.yml`'s `deploy` job, gated by the `production` GitHub Environment, is now the sole path to production. Also folds the old manual "push Worker secrets" step (§10.2 item 15) into the `deploy` job itself — `wrangler secret put` runs from the GitHub Actions secret values on every deploy (idempotent), removing the drift risk of a value living in two places that could silently diverge.

## 8. Testing Strategy Design

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | Password hashing/verification, lockout counting, token generation/expiry, animal data validation. |
| Integration | Vitest + `@cloudflare/vitest-pool-workers` | API endpoints (§4) exercised against a real Workers/D1 runtime in CI, not a mock. |
| End-to-End | Playwright | Visitor flow (browse/filter/lightbox/contact), Administrator flow (login/edit/CRUD/settings), Security flow (lockout, reset, forced first-login change) — matching requirements §12.3 exactly. |

CI enforces a minimum coverage threshold (recommended: 80%, consistent with the coverage gate already used on the owner's other project) before the deploy job is even eligible to run. `[ADDED]`

`[AMENDED]` 2026-07-23 (M8) — coverage collection uses **Istanbul**, not V8, despite `provider: 'v8'` being the more common Vitest default and what this section originally implied. Confirmed directly against Cloudflare's own docs and by running it: V8 coverage instrumentation depends on Node's `node:inspector` module, which doesn't exist in the workerd runtime `@cloudflare/vitest-pool-workers` uses — every `workers/**/*.test.ts` file threw immediately with `provider: 'v8'` set. Cloudflare's testing docs state this explicitly: "Native code coverage via V8 is not supported [in the Workers pool]. You must use instrumented code coverage via Istanbul instead." Istanbul instruments at the source-transform step instead of hooking the inspector protocol, so it works in both the plain-Node `"unit"` project and the workerd `"workers"` project. `npm run test:coverage` runs it; `vitest.config.ts`'s `coverage.include` scopes it to `workers/**/*.ts` plus the handful of testable `src/lib/*.ts` files (excludes `.tsx` components — no jsdom harness exists for those — and pure-data/DOM-only files like `tokens.ts`/`useFocusTrap.ts`).

## 9. Deployment & Infrastructure Design
`[AMENDED]` 2026-07-21 — one Worker project (`scattered-oaks-farms`), connected to GitHub via Cloudflare Workers Builds, not a separate Cloudflare Pages project. See the change log.

| Resource | Preview | Production |
|---|---|---|
| Worker project (`scattered-oaks-farms`) | Automatic preview deployment per PR (same project, Workers Builds) | Production deployment, bound to custom domain |
| D1 database | `scattered-oaks-db-preview` (seeded sample data) | `scattered-oaks-db` |
| R2 bucket | `scattered-oaks-media-preview` | `scattered-oaks-media` |
| Custom domain | auto-generated preview URL | `scattered-oaks-zebu.com` |
| Turnstile widget | Turnstile test/sandbox keys | Production site key + secret key |

### 9.1 Secret / Variable Matrix

| Secret | GitHub Actions | Cloudflare (preview) | Cloudflare (production) |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Yes | — | — |
| `RESEND_API_KEY` | Source of truth, pushed by CI every deploy `[AMENDED M9]` | Turnstile dummy key needs no Resend equivalent | Live key |
| `TURNSTILE_SECRET_KEY` | Source of truth, pushed by CI every deploy `[AMENDED M9]` | Cloudflare's published always-pass test secret key — no `wrangler secret put` needed | Live secret key |
| `ROOT_ADMIN_BOOTSTRAP_PASSWORD` | One-time seed only | — | Consumed idempotently by `scripts/seed-root-admin.ts` in the `deploy` job `[AMENDED M9]` |

`[ADDED]` 2026-07-23 (M9) — one non-secret GitHub Actions repository **Variable** (not a secret — it's the public Turnstile site key): `PUBLIC_TURNSTILE_SITE_KEY` = `0x4AAAAAAD6H-O_yKg6fVzMc`, read only by the `deploy` (production) job's build step. Replaces §10.2 item 14's original delivery mechanism (a Cloudflare Workers Builds build-time environment variable), which stopped running once Workers Builds' auto-deploy was disabled (see §7.2's amendment). The `preview-deploy` job deliberately never sets it, relying on `src/lib/turnstile.ts`'s existing always-pass dummy-sitekey fallback instead — this avoids needing to register every ephemeral preview URL as an allowed Turnstile hostname (Turnstile has no wildcard hostname support).

## 10. Manual Configuration Checklist
Every step below is a one-time, human-performed action — none of it can run inside CI on a brand-new GitHub/Cloudflare/Resend account. Work through each group once, in order, before the pipeline in §7 can run end to end. `[MANUAL SETUP]`

### 10.1 GitHub
1. Confirm the repository `Scattered-Oaks-Web-Page` is public (Settings > General) — required for the free required-reviewer Environment protection used below.
2. Enable branch protection on `main`: require a pull request before merging and require status checks to pass (Settings > Branches).
3. Create two GitHub Environments named `preview` and `production` (Settings > Environments).
4. On the `production` Environment, add the owner (Nate) as a required reviewer (Settings > Environments > production > Required reviewers).
5. Add repository secrets: `CLOUDFLARE_API_TOKEN`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `ROOT_ADMIN_BOOTSTRAP_PASSWORD` (Settings > Secrets and variables > Actions).
6. Confirm GitHub Actions is enabled for the repository (Settings > Actions > General).

### 10.2 Cloudflare
7. Create or confirm a Cloudflare account.
8. Add `scattered-oaks-zebu.com` as a Cloudflare zone/site, then update the domain's nameservers at the domain registrar to the two nameservers Cloudflare assigns — done once, at the registrar, outside of CI.
9. Create a scoped Cloudflare API Token limited to this account/zone with Workers Scripts:Edit, Pages:Edit, D1:Edit, R2:Edit, and Zone:DNS:Edit permissions; use it as the `CLOUDFLARE_API_TOKEN` GitHub secret from step 5.
10. Create the D1 databases via the Wrangler CLI: `wrangler d1 create scattered-oaks-db` and `wrangler d1 create scattered-oaks-db-preview`; record the returned database IDs in `wrangler.toml`.
11. Create the R2 bucket(s): `wrangler r2 bucket create scattered-oaks-media` (and a preview equivalent).
12. Create the `scattered-oaks-farms` Worker project and connect it to the GitHub repository via Workers Builds (Cloudflare dashboard > Workers & Pages > Create > Connect to Git), setting Build Command to `npm run build` and Deploy command to `npx wrangler deploy`. `[AMENDED]` 2026-07-21 — Cloudflare consolidated the separate Pages product into this unified Workers deploy flow; see the change log. `[AMENDED]` 2026-07-23 (M9) — **Workers Builds' auto-deploy-on-push must then be disabled** once GitHub Actions (M9) exists — see §7.2's amendment and the change log for why this isn't optional. The project stays Git-connected only for step 13's custom-domain binding.
13. Bind the custom domain `scattered-oaks-zebu.com` to the Worker project via its **Domains** tab (top ribbon, left of Settings — a dedicated tab Cloudflare added in a May 2026 update, not nested under Settings) — since the zone already lives in the same Cloudflare account, the DNS record and SSL certificate are provisioned automatically. `[AMENDED]` 2026-07-21 — see the change log.
14. Register a Cloudflare Turnstile widget for the domain to obtain a site key (public, used in the frontend) and a secret key (Worker secret) — Cloudflare dashboard > Turnstile. The widget's authorized-domain field is labeled **Hostname**; enter `scattered-oaks-zebu.com` as a bare FQDN (Turnstile supports no wildcards). `[AMENDED]` 2026-07-21 — see the change log. `[AMENDED]` 2026-07-22 (M7) — the site key also needs to reach the frontend build. `[AMENDED]` 2026-07-23 (M9) — **superseded the M7 delivery mechanism.** With Workers Builds' auto-deploy disabled (step 12), its build-time-environment-variable feature never runs. The site key is now a GitHub Actions repository **Variable** (not a secret) named `PUBLIC_TURNSTILE_SITE_KEY` = `0x4AAAAAAD6H-O_yKg6fVzMc`, read only by the production `deploy` job's build step — see §9.1 and the change log. The preview-URL Turnstile hostname is no longer needed at all: `preview-deploy` never sets this variable, so `src/lib/turnstile.ts` falls back to Cloudflare's published "always passes" test sitekey for every preview build.
15. Push the `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` into the Worker via `wrangler secret put`. `[AMENDED]` 2026-07-21 — see the change log. `[AMENDED]` 2026-07-23 (M9) — **automated, not manual.** The `deploy` CI job runs this on every production push using the GitHub Actions secret values directly (idempotent — `wrangler secret put` overwrites unconditionally) — see §7.2/§9.1 and the change log. Also corrects a latent bug in the original manual commands: production is `wrangler.toml`'s top-level/default environment (no `[env.production]` block exists), so the originally-written `--env production` flag would have failed with "No environment found in configuration."

### 10.3 Resend
16. Create a Resend account.
17. Add and verify the sending domain `mail.scattered-oaks-zebu.com` (confirmed 2026-07-21, `Requirements.md` §15). Since the zone is already on Cloudflare, use Resend's **Auto configure** option (Domain Connect — a "Sign in to Cloudflare" button that adds the required SPF/DKIM/MX records automatically) rather than copying records in by hand; manual entry in the Cloudflare DNS dashboard remains the fallback for accounts without this integration. `[AMENDED]` 2026-07-21 — see the change log.
18. Generate a Resend API key and store it as both the `RESEND_API_KEY` GitHub secret (step 5) and the Cloudflare Worker secret (step 15).

### 10.4 Root Administrator
19. After the first successful production deploy, log in as Root using the bootstrap credential, immediately change the password from the admin UI as required by requirements §7.2.4, and rotate the corresponding GitHub secret. `[AMENDED]` 2026-07-23 (M9) — the Root account itself is now created automatically too: `scripts/seed-root-admin.ts` runs as a `deploy`-job step, hashing `ROOT_ADMIN_BOOTSTRAP_PASSWORD` with the real production password-hashing code (`workers/lib/password.ts`) and inserting the row idempotently (username `Root`, email `nate.dibling@gmail.com`, `force_password_change=1`) — a no-op on every deploy after the first, so this step is safe to leave running indefinitely, including after the credential rotation this item describes.

## 11. Traceability Matrix

| Requirements Doc Section | Designed In |
|---|---|
| §6 Design Reference Summary / §6.4 Design Iteration Workflow | SDD §3 (Frontend Design), SDD §7 (CI/CD Pipeline Design) |
| §7.1 Public Website | SDD §3 (Frontend Design), SDD §4 (Backend/API Design) |
| §7.2 Administrator Mode | SDD §3, §4, §5, §6 (Security Design) |
| §8 Non-Functional Requirements | SDD §2 (Architecture Overview), §3, §6, §8 (Testing) |
| §9 Technical Architecture | SDD §2, §3, §4 |
| §10 Data Model | SDD §5 (Data Design) |
| §11 CI/CD & Deployment incl. §11.1 Approval Gate | SDD §7 (CI/CD Pipeline Design), §9 (Deployment & Infrastructure), §10 (Manual Configuration Checklist) |
| §12 Testing Requirements | SDD §8 (Testing Strategy Design) |

## Appendix A: Glossary
See Section 1.4 for the full acronym/definition table used throughout this document.

## Appendix B: Diagram Index
- Figure 1 — System Architecture / Context Diagram (Section 2).
- Figure 2 — D1 Entity-Relationship Diagram (Section 5).
- Figure 3 — CI/CD Pipeline with Required-Reviewer Approval Gate (Section 7).

## Change Log
Entries added here whenever implementation causes a design decision to change from what's documented above. Each entry should say what changed, why, and which section(s) were amended.

- **2026-07-20** — §4.1, §4.3, §5.1: Added `animals.deleted_at` (nullable timestamp). `DELETE /api/admin/animals/:id` now sets it instead of removing the row; all public animal queries filter `WHERE deleted_at IS NULL`. Decided ahead of implementation to support future recoverability/export needs without a later schema migration.
- **2026-07-21** — §2.1, §2.2, §7.1, §9, §10 items 12–13: Cloudflare has consolidated the standalone Pages product into a unified Workers deploy model (discovered while actually connecting the repo in Cloudflare's dashboard, whose "Set up your application" screen now shows only Project Name / Build Command / Deploy command — no Pages-specific framework preset or output-directory fields). One Worker project, `scattered-oaks-farms`, now serves both the static frontend and the API via a single `wrangler deploy`/`npx wrangler deploy` command, connected to GitHub through Workers Builds rather than a separate Cloudflare Pages project. The underlying architecture is unchanged (static frontend + API + D1 + R2 + custom domain); only the Cloudflare product surface and deploy command changed. Preview vs. production is now a `wrangler.toml` named-environment distinction rather than two differently-named Worker scripts.
- **2026-07-21** — §10 item 13: Custom domain binding is done via a dedicated **Domains** tab on the Worker project's top ribbon (a May 2026 Cloudflare dashboard addition), not nested under Settings as originally documented. Discovered while actually performing this step; functionally unchanged (same-account zone still auto-provisions the DNS record and certificate).
- **2026-07-21** — §10 item 14: Turnstile's authorized-domain field is labeled **Hostname**, requires a bare FQDN per entry, and supports no wildcards. The widget was created with only `scattered-oaks-zebu.com`; the preview-URL hostname is deferred until a real preview deployment exists (the `*.pages.dev`-style wildcard originally planned won't work regardless, since wildcards aren't supported).
- **2026-07-21** — §10 item 17: Sending domain confirmed as `mail.scattered-oaks-zebu.com` (resolves `Requirements.md` §15). Also switched the recommended verification path to Resend's Auto configure/Domain Connect integration, discovered while actually performing this step — it adds the DNS records automatically since the zone is already on Cloudflare, avoiding manual copy-paste.
- **2026-07-21** — §10 item 15: Confirmed `wrangler secret put --env` requires a local `wrangler.toml` defining the Worker name and named environments — tried it ahead of M1 and got "Required Worker name missing" / "No environment found in configuration." Sequencing note only; no design change, just makes explicit that this step must follow M1, not just "the Worker existing remotely."
- **2026-07-21** — §5.2a (new): added `gallery_photos` (id, url, label, description, display_order, timestamps). Discovered during M2 implementation that the original data design never actually defined a table backing `GET /api/gallery` or the design prototype's 9-item captioned gallery grid — an oversight in the original SDD, not a scope change.
- **2026-07-21** — §4: adopted [Hono](https://hono.dev/) as the router library (no framework was specified originally); added "gallery" to the route-module list, the same oversight as the missing `gallery_photos` table above. Decided during M3 implementation.
- **2026-07-21** — §3.1, §3.4: resolved the tension between "static HTML by default" and "nothing hardcoded at build time" in favor of one hydrated Preact island rendering the whole `/` page, fetching live data client-side on mount. Decided during M4 implementation; see §3.4 for the full reasoning.
- **2026-07-21** — §4.1: `GET /api/animals` list rows now include `primary_image_url`, a thumbnail derived from the first ordered `animal_media` row, added when M4's card grid needed one without an N+1 fetch per animal.
- **2026-07-21** — §5.3, §6.3: added `admins.email` (unique, `migrations/0002_add_admin_email.sql`) — the original design never gave the `admins` table an email column despite §6.3's reset-link and §4.3's new-admin-invite emails needing somewhere to send to. Discovered during M5 implementation. §6.3 step 1 also amended from "an identifier" to concretely "email address."
- **2026-07-21** — §6.2: added a note that login runs a real PBKDF2 derivation against a fixed dummy hash for unknown usernames, closing a timing side-channel that would otherwise leak account existence. §6.3a (new): documented the concrete rate-limiting design for login/forgot-password (reusing the lockout counter and `password_reset_tokens` cooldown instead of a separate KV/Durable-Object-backed limiter), and pinned the concrete duration constants (`workers/lib/authConstants.ts`): 15-minute lockout, 24-hour session, 1-hour reset token, 5-minute forgot-password cooldown. All decided during M5 implementation; resolves requirements §8.1's rate-limiting requirement without new infrastructure.
- **2026-07-22** (M6) — §3.1: `/admin/login`, `/admin`, `/admin/animals`, `/admin/content`, `/admin/settings`, `/admin/users` collapsed from six route-map rows into one (`/admin`, one hydrated `AdminShell` island managing all of those as internal view state) — matches the same single-island pattern already used for `/` (§3.4); `/admin/reset-password` stays a real page since it's reached via an emailed link. §3.2: added GalleryEditor, AdminResetPassword, AdminForcePasswordChange components. §4.1: added `GET /media/*` (public, serves R2 objects — no public R2 domain is configured in this project's Cloudflare setup). §4.2: added `GET /api/auth/me`. §4.3: added gallery CRUD/reorder endpoints (approved scope addition — `gallery_photos` existed with a public read endpoint but no admin management anywhere in the original design); noted the first use of HTTP 403 for two Root-only guards; corrected the animal-media-upload note (client-side pre-resize is M7, not M6). §5.4: `audit_log.admin_id` made nullable with `ON DELETE SET NULL` (`migrations/0003_audit_log_admin_id_nullable.sql`) — the original `NOT NULL` + no-`ON DELETE` FK would block deleting any admin with a logged action once real audit logging went live, which M6 makes near-universal. §5.4: added three image-backed `site_content` keys (`site.logo_url`, `hero.photo_url`, `about.photo_url`) — the hero/About photos and farm logo were hardcoded `<img src>` paths with no backing data at all since M4, so Requirements §7.2.1's "replace any image" had nothing to attach to until now. Requirements.md §7.2.3/§15 also amended — see that document's change log.
- **2026-07-22** (M7) — §6.5: added `OWNER_CONTACT_EMAIL` (`heather.a.johnston@gmail.com`, plain `wrangler.toml [vars]`, not a secret) — no requirement or design section anywhere named an actual recipient address for contact-form inquiries; confirmed with the user during implementation rather than assuming the publicly-displayed `hello@scatteredoaksfarms.com` forwards anywhere real. §10 item 14: added the `PUBLIC_TURNSTILE_SITE_KEY` Workers Builds build-time variable requirement, distinct from the pre-existing `TURNSTILE_SECRET_KEY` runtime secret. Image pre-resize (§7.1/§8.2 of Requirements.md, previously unspecified in any doc): implemented as 2000px longest-edge cap, JPEG re-encode at quality 0.85 for most images, **except PNG inputs stay PNG** — a mid-implementation correction after realizing `site.logo_url` uploads are routinely transparent-background logos, and flattening transparency to an opaque JPEG background would visibly break the logo against the footer's dark background (§3.3's shared design tokens). GIFs and video pass through unresized (animation/out-of-scope respectively). No `[AMENDED]` needed for §4.1/§6.4 — the built `POST /api/contact` request/response shape and Turnstile-before-Resend flow already matched what those sections documented verbatim.
- **2026-07-23** (M8) — §8: coverage provider corrected from the implied V8 default to **Istanbul** — V8 coverage doesn't work inside the workerd runtime `@cloudflare/vitest-pool-workers` uses (confirmed against Cloudflare's own docs and by running it), so every `workers/**/*.test.ts` file would fail with coverage enabled otherwise. §3.2: AdminLogin gained a "Forgot password?" mode — `api.requestPasswordReset()` existed since M5/M7 but had no UI entry point, discovered as a real gap (not just a test gap) while building the full-security-flow E2E coverage M8 requires. No `[AMENDED]` needed for §8.3 (accessibility) or the §8.2 performance target — the axe-core scan found the WCAG 2.1 AA basics already solid (a handful of real gaps fixed: missing `aria-label`s on icon-only reorder buttons, one empty `alt` on an admin photo-management grid, `Space`-key support alongside `Enter` on two clickable-div components), and `loading="lazy"` was added to every below-the-fold `<img>` exactly as §8.2 already specified — both are code fixes for pre-existing gaps, not design changes.
- **2026-07-23** (M11) — §8.6: closed the backup/retention requirement, which nothing had implemented yet. D1 already gets Cloudflare's built-in point-in-time recovery for free, but that's an in-place restore only, not a portable export — added a weekly (`.github/workflows/backup.yml`, Sunday 06:00 UTC, plus manual `workflow_dispatch`) `wrangler d1 export --remote` job. Its output is uploaded to a **new, dedicated** `scattered-oaks-backups` R2 bucket rather than the existing `scattered-oaks-media` bucket — `workers/routes/media.ts` serves any key under that bucket publicly and unauthenticated, and a D1 dump contains password hashes and session tokens, so it must never live there. `scattered-oaks-backups` has a 90-day expiry lifecycle rule (`d1/` prefix) so storage doesn't grow unbounded. For R2 object recoverability: `workers/lib/r2.ts`'s `deleteFromR2` no longer hard-deletes — it copies the object under a `trash/` prefix in the same bucket first, and a new 30-day-expiry lifecycle rule on both `scattered-oaks-media` and `scattered-oaks-media-preview` cleans those up automatically. True R2 object versioning isn't available (confirmed by checking the installed `wrangler` 4.113.0's actual `r2 bucket` subcommands — no versioning command exists, only lifecycle/lock/CORS/notification), so this trash-prefix approach is the practical substitute.
- **2026-07-23** (M9) — §7.2, §9.1, §10 items 12/14/15/19: investigating M9 found that Cloudflare Workers Builds' Git auto-deploy (set up in Track B, never revisited) had been deploying every push to `main` straight to production since M6, with zero review — confirmed via `wrangler deployments list` (a deployment timestamped to the exact moment of each milestone's push) and the live site itself (`/api/*` returning 500, since production D1 had zero migrations ever applied remotely; `wrangler secret list` also showed zero Worker secrets set). This completely bypassed the required-reviewer gate §7.1 step 4 describes — in practice there was no approval gate at all. Fixed: Workers Builds' auto-deploy-on-push disabled (`Manual-Setup-Guide.md` Phase E1a); `.github/workflows/ci.yml`'s `deploy` job (gated by the `production` GitHub Environment) is now the sole path to production. Also, by user decision: §10 item 15 (pushing `RESEND_API_KEY`/`TURNSTILE_SECRET_KEY` into the Worker) is automated into that same `deploy` job instead of staying a manual one-time step, removing drift risk between the GitHub-secret source of truth and the Worker's copy. §10 item 14's site-key delivery mechanism (a Workers Builds build-time variable) stopped running for the same reason and is replaced by a GitHub Actions repository variable (§9.1). §10 item 19: the production Root account is now also created automatically, by a new idempotent `scripts/seed-root-admin.ts` step in the `deploy` job (email `nate.dibling@gmail.com`, user-specified during M9 planning rather than reusing `OWNER_CONTACT_EMAIL`) — previously no design or script existed for this at all, meaning M11's "log in as Root" had no account to log into.
