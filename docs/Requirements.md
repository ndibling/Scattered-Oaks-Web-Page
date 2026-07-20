# Scattered Oaks Farms — Website Requirements Specification

**Version 2.2 (living document)** — originally authored as Version 2.1 (Combined & Expanded), July 19, 2026, as a Word document (`Scattered Oaks Farm Requirements v2.docx`, preserved in this folder as the frozen v1 baseline). This Markdown version is the living source of truth going forward: it is updated whenever implementation changes the actual requirements, per the workflow in `Development-Plan.md`.

This document combines the original requirements PDF (**"Scattered Oaks Farm Requirements.pdf"**) with the functional design already built in the Claude Design project (**"Scattered Oaks Farms.dc.html"**, project ID `a8493b50-0e7e-46e9-a0ef-930263d1a0c8`), plus additional requirements identified during analysis. Every requirement is tagged with its source: `[PDF]` = from the original requirements document, `[DESIGN]` = derived from the existing Claude Design prototype, `[ADDED]` = introduced during analysis, `[AMENDED]` = changed after implementation began (see change log at the bottom).

## Table of Contents
1. [Introduction & Purpose](#1-introduction--purpose)
2. [Project Overview](#2-project-overview)
3. [Goals & Objectives](#3-goals--objectives)
4. [Scope](#4-scope)
5. [Stakeholders & Roles](#5-stakeholders--roles)
6. [Design Reference Summary](#6-design-reference-summary)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Technical Architecture](#9-technical-architecture)
10. [Data Model](#10-data-model)
11. [CI/CD & Deployment](#11-cicd--deployment)
12. [Testing Requirements](#12-testing-requirements)
13. [Assumptions & Constraints](#13-assumptions--constraints)
14. [Out of Scope / Future Considerations](#14-out-of-scope--future-considerations)
15. [Open Questions](#15-open-questions)
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: Source Documents](#appendix-b-source-documents)
- [Appendix C: Summary of Added Requirements](#appendix-c-summary-of-added-requirements)
- [Change Log](#change-log)

## 1. Introduction & Purpose
This document defines the requirements for the Scattered Oaks Farms website — a public-facing marketing and animal-listing site for a miniature zebu farm, plus an administrator content-management capability. It supersedes and expands the original one-page requirements PDF by incorporating the detailed functional behavior already present in the approved Claude Design prototype, and adds requirements needed to make the design implementable, secure, and maintainable on the chosen hosting platform (Cloudflare).

The intended audience is the site owner (Heather Johnston / Nate Dibling) and whoever implements the website, including any future AI-assisted or human development work.

## 2. Project Overview
Scattered Oaks Farms is a miniature zebu breeding operation and a DBA of Heather Johnston, based in Bradenton, Florida. The farm currently maintains a herd of 38 head (35 cows/calves and 3 bulls), each with its own name, temperament, and (where applicable) sale status. The website's core purpose is to showcase the herd, let prospective buyers browse available animals and their details, and let them submit an inquiry per animal (or a general inquiry) to begin a sale conversation with Heather directly. The website itself does not process payments or finalize sales — that happens off-platform. `[PDF]`

## 3. Goals & Objectives
- Present a warm, professional public face for the farm that reflects its brand (palm/oak, pasture-raised, family-run). `[DESIGN]`
- Let visitors browse the herd, filter by sale status, and view rich detail (photos, video, registration facts) per animal. `[DESIGN]`
- Convert visitor interest into a direct inquiry to the owner, tagged to the animal of interest. `[PDF]`
- Give the owner full self-service control over animal listings, photos, and site text without needing a developer for routine updates. `[PDF]`
- Run entirely on infrastructure the owner already intends to use (Cloudflare + GitHub), at minimal to no ongoing cost. `[ADDED]`
- Be secure enough to safely expose an administrator login to the public internet. `[ADDED]`

## 4. Scope

**In Scope**
- Public marketing site: home/hero, about, available animals, gallery, contact. `[DESIGN]`
- Administrator CMS: text edits, image replacement, animal CRUD, admin account management. `[PDF]`
- Authentication, password policy, lockout, and reset flows for administrators. `[PDF]`
- GitHub repository, CI build, and automated deploy to Cloudflare under `scattered-oaks-zebu.com`. `[PDF]`
- Automated test coverage for the above. `[PDF]`

**Out of Scope**
- Online payment processing or e-commerce checkout — sales are finalized off-site. `[PDF]`
- Public user accounts / visitor logins — only Administrators authenticate. `[DESIGN]`
- Multi-farm or multi-tenant support. `[ADDED]`
- Livestreaming or real-time herd cameras. `[ADDED]`

## 5. Stakeholders & Roles

| Role | Description |
|---|---|
| Standard User (Visitor) | Any public website visitor. Can browse, filter, view animal detail, view gallery, and submit a contact/inquiry form. No login required. |
| Administrator | Authenticated user who can edit site text, replace images, manage animal listings, and manage other admin accounts. Cannot be locked out permanently without a reset path. |
| Root Administrator | A distinguished Administrator account (username "Root") that cannot be deleted and can force-reset any other admin's password as a last resort. |

## 6. Design Reference Summary
The approved visual and functional design lives in the Claude Design project "Scattered Oaks Farms website design" (project ID `a8493b50-0e7e-46e9-a0ef-930263d1a0c8`), file `Scattered Oaks Farms.dc.html`. This section summarizes what that prototype already defines, since it is the binding visual reference for implementation. `[DESIGN]`

### 6.1 Visual System
- Color palette defined via OKLCH tokens: warm cream/sand background, deep teal accent, muted terracotta/rust secondary accent, dark oak-brown text.
- Typography: "Quicksand" (headings/UI, weights 500–700) and "Nunito" (body text, weights 400–800), loaded from Google Fonts.
- Rounded, soft-shadow card and pill-button visual language throughout; a small "bob" animation accent on the hero badge.
- Fully responsive: fluid type via `clamp()`, responsive grid (`auto-fit`/`minmax`) for the animal cards and gallery tiles.

### 6.2 Page Sections (single-page, anchor-navigated)
- Sticky header/nav: logo + farm name, links to Home / About / Available Animals / Gallery, and a prominent Contact pill button.
- Hero: tagline, headline ("Small Farm, Big Personalities."), intro copy, two CTAs (See Who's Available, Our Story), featured photo, "38 head strong" badge.
- About: farm story copy, stat callouts (35 Cows & Calves / 3 Herd Bulls / 100% Pasture Raised).
- Available Animals: filter tabs (For Sale / Pending / Coming Soon / Not For Sale / View All), responsive card grid, each card double-clickable to open a detail lightbox.
- Animal Detail Lightbox: photo/video carousel with prev/next navigation and a photo counter, status badge, price or "Inquire" label, description, and a registration detail panel (Barn Name, Registered Name, IMZA#, Expected Height, Parents/Registered sire & dam), plus an "Ask About {name}" CTA that pre-fills the contact form.
- Gallery: grid of lifestyle photos, each opens a lightbox with a caption/description; links out to the farm's Facebook page.
- Contact form: Name, Email, "Interested In" dropdown (auto-populated with sellable animal names, defaulting to "General Inquiry"), Message, submit button, and a thank-you confirmation state.
- Footer: logo, farm name, DBA/owner line, contact email, Facebook icon link.

### 6.3 Configurable Site Behaviors Already Present in the Design
- `showPublicPrices` (boolean): toggles whether animal prices are shown publicly or replaced with "Inquire." `[DESIGN]`
- `galleryStyle` (grid / mosaic): controls the gallery's layout density. `[DESIGN]`
- Both should become Administrator-editable site settings rather than fixed at build time (see Section 7.2). `[ADDED]`

### 6.4 Design Iteration / UX Change Workflow
Because the visual source of truth lives in Claude Design rather than being hand-authored in the repository, future UX/visual changes follow a defined round trip so the design project and the production codebase never silently drift apart: `[ADDED]`

1. **Pull** — before starting a change, the Claude Design project is synced with the latest implemented state from GitHub, so edits are made against current reality rather than a stale mockup.
2. **Design** — the UX/visual change is made directly in the Claude Design project (claude.ai/design), the same project referenced throughout this section.
3. **Push to Claude Code** — the updated design file(s) are pulled from Claude Design into the repository's working copy (a dedicated design-reference location, kept separate from production source), incrementally per component rather than as a wholesale replace.
4. **Implement** — the updated design reference is translated into the actual production frontend code (see Section 9.1 — production is a rebuilt framework, not the raw `.dc.html` prototype), preserving the design's exact visual/interaction spec and updating any affected tests.
5. **GitHub CI pipeline** — standard PR, automated tests, a per-PR preview environment, the required-reviewer production approval gate (Section 11), then production deploy.

## 7. Functional Requirements

### 7.1 Public Website (Standard User Mode)
The Standard User experience implements the Claude Design prototype as designed, backed by live data instead of hardcoded sample content. `[PDF]`
- All page sections listed in 6.2 are implemented pixel-faithful to the approved design. `[DESIGN]`
- The Available Animals grid, filters, and lightbox are driven by live animal data from the database, not a static list. `[ADDED]`
- The contact form sends the inquiry to the farm owner and, if an animal was selected, includes that animal's name/identifier in the notification. `[PDF]`
- The contact form is protected against automated spam submissions. `[ADDED]`
- All images are served responsively (appropriately sized/compressed) rather than as raw uploaded files. `[ADDED]`

### 7.2 Administrator Mode
An Administrator logs in with a username and password to unlock a management interface layered over the public site. `[PDF]`

#### 7.2.1 Content Editing
- Edit any text on the site (headline, About copy, stat labels, form labels, etc.) without altering style, font, or placement — i.e., text fields are edited in place, not through free-form markup. `[PDF]`
- Replace any image on the site (hero photo, About photo, farm logo, gallery photos) with a newly uploaded image, with the layout/crop behavior unchanged. `[PDF]`
- Toggle the `showPublicPrices` site setting (show real prices vs. "Inquire"). `[ADDED]`
- Toggle the `galleryStyle` site setting (grid vs. mosaic). `[ADDED]`

#### 7.2.2 Animal Management
- Add a new animal record. `[PDF]`
- Edit an existing animal record. `[PDF]`
- Delete an animal record (with a confirmation step to prevent accidental loss). `[PDF]` — **`[AMENDED]` 2026-07-20: deletion is a soft delete** (the record is hidden from the public site and marked deleted, not removed from the database), to support recoverability and a future retention/export policy. See Data Model §10 and the change log.
- Mark an animal's status as For Sale, Pending, Coming Soon, or Not For Sale, matching the filter categories already defined in the design. `[DESIGN]`
- Set/clear a sale price; price display respects the `showPublicPrices` setting. `[PDF]`
- Enter full registration detail: description/blurb, barn name, registered name, IMZA number, expected height, sire (registered name), dam (registered name). `[PDF]`
- Upload and order multiple photos and/or one video per animal, matching the carousel behavior in the detail lightbox. `[DESIGN]`
- Control display order of animals within the grid. `[ADDED]`

#### 7.2.3 Administrator Account Management
- Root and any Administrator can add, edit, or delete other Administrator accounts. `[PDF]`
- The Root account itself cannot be deleted, and cannot be locked out permanently. `[ADDED]`
- Standard username/password authentication for all Administrator accounts. `[PDF]`

#### 7.2.4 Password & Account Security
- Password minimum length 8 characters, requiring at least 1 number, 1 lowercase letter, 1 uppercase letter, and 1 special character. `[PDF]`
- Account lockout after 3 consecutive failed login attempts. `[PDF]`
- Locked-out or forgotten-password users can request a reset email containing a secure, time-limited link to a page where they set a new password. `[PDF]`
- As a last resort, the Root account can directly set a new password for any other Administrator account. `[PDF]`
- New Administrator accounts are created with an auto-generated temporary password, emailed to the new admin, who must change it immediately upon first login. `[PDF]`
- Passwords do not expire. `[PDF]`
- A root credential exists for initial setup; it is provisioned and rotated through a secure, out-of-band process (a deployment secret consumed by a one-time database seed step) rather than being hardcoded or committed anywhere in the codebase or documentation. `[ADDED]`
- All Administrator actions that change content (text edits, image replacement, animal CRUD, settings changes) are recorded in an audit log (who, what, when) for accountability. `[ADDED]`

## 8. Non-Functional Requirements

### 8.1 Security
- All administrator passwords are stored hashed (e.g., bcrypt or argon2) — never in plaintext, in code, in the database, or in any project document. `[ADDED]`
- All traffic served over HTTPS (provided natively by Cloudflare). `[ADDED]`
- Session tokens are signed, httpOnly, and expire; administrator sessions can be invalidated on logout. `[ADDED]`
- Login attempts and password-reset requests are rate-limited to blunt brute-force/enumeration attacks. `[ADDED]`
- All administrator inputs (text edits, animal fields, uploaded files) are validated and sanitized server-side. `[ADDED]`
- The public contact form is protected by Cloudflare Turnstile (free, privacy-preserving CAPTCHA alternative) to block bot spam. `[ADDED]`
- Secrets (email API key, session signing key, root bootstrap credential) are stored only as Cloudflare/GitHub Actions secrets, never committed to the repository. `[ADDED]`

### 8.2 Performance
- Pages served from Cloudflare's edge CDN for low latency regardless of visitor location. `[ADDED]`
- Images are resized/compressed on upload and lazy-loaded below the fold. `[ADDED]`
- Target: first contentful paint under 2 seconds on a typical broadband/mobile connection. `[ADDED]`

### 8.3 Accessibility
Site targets WCAG 2.1 AA: sufficient color contrast, keyboard navigability (including the lightbox/modal and filter tabs), alt text on all animal and gallery images, accessible form labels. `[ADDED]`

### 8.4 SEO & Discoverability
Descriptive page titles/meta descriptions, Open Graph tags (so shared links show a farm photo and description), `sitemap.xml`, and `robots.txt`. `[ADDED]`

### 8.5 Responsive Design & Browser Support
- Layout adapts across mobile, tablet, and desktop breakpoints as already implemented in the design's fluid grid/typography. `[DESIGN]`
- Supported on current versions of Chrome, Safari, Firefox, and Edge (desktop and mobile). `[ADDED]`

### 8.6 Availability & Backups
- Site availability relies on Cloudflare's platform SLA; no additional uptime infrastructure required. `[ADDED]`
- Animal data and site settings (D1 database) are backed up/exportable on a regular schedule; uploaded images (R2) are versioned or retained to allow recovery from accidental overwrite/deletion. `[ADDED]`

## 9. Technical Architecture
The owner has confirmed a preference to keep the entire stack on Cloudflare, with no separate hosting provider, and to deploy everything from the single GitHub repository via CI. The following architecture satisfies that constraint while supporting all functional requirements above. `[ADDED]`

### 9.1 Frontend
The Claude Design prototype is built in a design-tool-specific pseudo-component syntax (custom tags like `<sc-for>`/`<sc-if>`, template placeholders). It must be re-implemented in a real, buildable framework compatible with Cloudflare Pages (e.g., a static-site generator or lightweight component framework), reproducing the approved visual design and interaction behavior exactly — it is a faithful rebuild, not a re-design.

Animal, gallery, and site-settings data are fetched from the backend API at build/request time rather than hardcoded, so Administrator edits appear on the live site without a code deployment.

### 9.2 Backend / API
- Cloudflare Workers implement the API: authentication, session management, animal CRUD, content/text edits, image upload handling, site settings, and the contact form submission handler.
- Cloudflare D1 (managed SQLite) stores animals, photos/media metadata, site text content, site settings, administrator accounts, sessions/reset tokens, and the audit log.
- Cloudflare R2 stores uploaded images and video; the Workers API returns R2-backed URLs (optionally through Cloudflare Images for on-the-fly resizing) to the frontend.

### 9.3 Authentication
- Username/password authentication for Administrators only; passwords hashed server-side (e.g., via a WebCrypto-based PBKDF2/Argon2 implementation compatible with the Workers runtime).
- Signed, httpOnly session cookies issued on login; server-side session/token store in D1 for revocation and reset-link expiry.

### 9.4 Transactional Email
- Resend is used for password-reset and new-admin-invite emails: a free-tier HTTP API that works directly from Cloudflare Workers without SMTP, and avoids the restrictions now placed on Cloudflare's previous zero-config MailChannels-for-Workers integration. `[ADDED]`
- The Resend API key is stored as a GitHub Actions secret and pushed to the Worker as a Cloudflare secret (`wrangler secret put`) during the deploy step — a one-time setup, with no manual step required on subsequent deploys. `[ADDED]`

### 9.5 Bot / Spam Protection
Cloudflare Turnstile is embedded in the public contact form and validated server-side before an inquiry email is sent. `[ADDED]`

## 10. Data Model

**Animal entity** — fields derived directly from the existing design's data structure plus PDF-specified detail fields: `[DESIGN]`

| Field | Description | Source |
|---|---|---|
| Name (display/barn name) | Public-facing name shown on cards and in the lightbox | Design |
| Type | Cow / Bull / Calf | Design |
| Sex | Cow / Bull Calf / Heifer Calf / Bull, etc. | Design |
| Age | Free-text age or date of birth | Design |
| Status | For Sale / Pending / Coming Soon / Not For Sale | Design |
| Price | Numeric sale price; nullable when Not For Sale | PDF |
| Description / Blurb | Short marketing description shown on card and detail view | PDF |
| Registered Name | Official registered name | PDF |
| IMZA Number | Registry identification number | PDF |
| Expected Height | Projected mature height | PDF |
| Sire (Registered Name) | Father's registered name | PDF |
| Dam (Registered Name) | Mother's registered name | PDF |
| Photos / Video | Ordered list of images and optional video for the detail carousel | Design |
| Display Order | Manual sort position within the herd grid | Added |
| Deleted At | Nullable timestamp; set instead of removing the row on delete (soft delete) | `[AMENDED]` 2026-07-20 |

**Site Settings entity:**
- `showPublicPrices` (boolean) `[DESIGN]`
- `galleryStyle` (grid / mosaic) `[DESIGN]`

**Administrator entity:**
Username, hashed password, role (Root / Administrator), account created/last-login timestamps, forced-password-change flag. `[ADDED]`

**Audit Log entity:**
Actor (admin), action type, target entity, timestamp, before/after summary for text and settings edits. `[ADDED]`

## 11. CI/CD & Deployment
- Source repository: GitHub — `Scattered-Oaks-Web-Page`. `[PDF]`
- GitHub Actions workflow builds the frontend, runs the full automated test suite (Section 12), and deploys to Cloudflare (Pages + Workers, via Wrangler) on merge to the `main` branch. `[PDF]`
- Custom domain `scattered-oaks-zebu.com` is bound to the Cloudflare Pages/Workers deployment. `[PDF]`
- Required deployment secrets, stored in GitHub Actions and/or Cloudflare, include: Cloudflare API token, Resend API key, session-signing key, and the one-time root-admin bootstrap credential. `[ADDED]`

### 11.1 Deployment Approval Gate
The owner wants to personally review every change before it reaches the live domain. The following GitHub-native approach achieves that with no new tooling, no added cost, and no manual CLI steps beyond a single click per release (the repository is public, which makes GitHub's required-reviewer Environment protection rule free to use): `[ADDED]`
- All changes land on `main` via pull request, giving a natural point to review the diff before anything ships. `[ADDED]`
- Cloudflare Pages automatically builds a live preview URL for every PR/branch; the Workers API mirrors this with a named preview/staging Wrangler environment (its own Worker plus a separate, seeded D1 database), deployed by CI on every PR — so the reviewer can click through a real, working staging site, not just a code diff. `[ADDED]`
- The production-deploy job targets a GitHub Environment named `production`, configured in the repo's Settings > Environments with the owner (Nate) as a required reviewer. When a merge to `main` reaches that job, GitHub Actions pauses with a pending deployment; nothing pushes to the live domain until the owner clicks "Approve and deploy" in the Actions UI or GitHub mobile app. `[ADDED]`
- Net effect: merging a pull request never directly pushes to the live site. It only unlocks a deploy that still requires the owner's explicit one-click approval, after optionally checking the PR's live preview URL. `[ADDED]`

| Environment | Targets |
|---|---|
| `preview` (per PR) | Preview Cloudflare Pages deployment + a preview Worker + a separate/seeded D1 database, for reviewing a change before merge. |
| `production` (main, gated) | Production Worker + production D1 + R2, bound to `scattered-oaks-zebu.com`; deploy job requires the owner's manual approval in GitHub before it runs. |

## 12. Testing Requirements
"All necessary tests to ensure functionality" (per the original PDF) is interpreted as the following concrete coverage: `[PDF]`

### 12.1 Unit Tests
Password policy validation, password hashing/verification, lockout counting logic, token generation/expiry, animal data validation.

### 12.2 Integration Tests
API endpoints for authentication, animal CRUD, content/settings edits, image upload, and contact-form submission, exercised against a test D1 instance.

### 12.3 End-to-End Tests
- Visitor flow: browse animals, apply each filter tab, open the detail lightbox (including the photo/video carousel), submit the contact form.
- Administrator flow: log in, edit a text field, replace an image, add/edit/delete an animal, toggle a site setting.
- Security flow: trigger lockout after 3 failed attempts, complete a password-reset via emailed link, complete the forced first-login password change for a newly created admin.

### 12.4 CI Gate
The full test suite must pass before any deploy proceeds; a minimum coverage threshold is enforced in CI. `[ADDED]`

## 13. Assumptions & Constraints
- All hosting, compute, storage, and email stay within Cloudflare's and Resend's free tiers at the site's expected traffic/herd size. `[ADDED]`
- The owner (or a delegated admin) will provide final farm text copy and photography; placeholder/sample content from the design (the 11 sample animals) will be replaced with the real herd of 38. `[DESIGN]`
- The Facebook page (Scattered Oaks Farm Miniature Zebu) remains the canonical social channel linked from the site. `[DESIGN]`
- No online payment processing is required; all sales are completed off-platform. `[PDF]`

## 14. Out of Scope / Future Considerations
- Online payments / deposits / e-commerce checkout.
- Public visitor accounts, saved favorites, or notification subscriptions.
- A blog or news feed (could be a future addition given the farm's Facebook activity). `[ADDED]`
- Multi-language support. `[ADDED]`

## 15. Open Questions
- Should the Administrator login/CMS live at a dedicated path (e.g., `/admin`) on the same domain, or a separate subdomain? — **Resolved:** `/admin` on the same domain (SDD §3.1).
- What is the desired retention/export policy for old animal records after an animal is sold or removed? — **Resolved 2026-07-20:** soft delete (see §7.2.2, §10, and the change log).
- Should there be more than two admin roles (e.g., a read-only or limited editor role) in the future, or is Root/Administrator sufficient long-term? — Open; deferred, out of scope for v1 (§14).
- Confirm the outbound "from" email address/domain to authenticate with Resend (e.g., a subdomain of `scattered-oaks-zebu.com`). — Open; to be resolved during Development Plan milestone B3.

## Appendix A: Glossary

| Term | Meaning |
|---|---|
| DBA | "Doing Business As" — Scattered Oaks Farms operates as a DBA of Heather Johnston. |
| IMZA | International Miniature Zebu Association — the breed registry issuing the animal's registration number. |
| D1 | Cloudflare's managed, serverless SQLite database product. |
| R2 | Cloudflare's S3-compatible object storage product, used here for images/video. |
| Workers | Cloudflare's serverless compute platform, used here for the API/backend. |
| Turnstile | Cloudflare's free CAPTCHA alternative for bot/spam protection. |
| Wrangler | Cloudflare's CLI/deploy tool for Workers and Pages, used in the CI pipeline. |

## Appendix B: Source Documents
- `Scattered Oaks Farm Requirements.pdf` — original owner-authored requirements (2 pages).
- Claude Design project "Scattered Oaks Farms website design" — project ID `a8493b50-0e7e-46e9-a0ef-930263d1a0c8`, file `Scattered Oaks Farms.dc.html`, read via the Claude Design integration on 2026-07-19.

## Appendix C: Summary of Added Requirements
Every item tagged `[ADDED]` throughout this document, gathered here with rationale:
- **Cloudflare-native architecture (Workers + D1 + R2)** — Owner wants everything on one platform with no separate hosting bill, deployed entirely from GitHub CI.
- **Resend for transactional email** — Cloudflare has no built-in outbound email; Resend's free HTTP API works from Workers without SMTP and needs no recurring manual deploy step.
- **Root credential via secure out-of-band provisioning, not hardcoded** — The source PDF included a real password in plaintext; committing or documenting real credentials is a security risk regardless of intent.
- **Password hashing, rate limiting, session security, input validation** — The PDF specifies password complexity rules but not how credentials/sessions are protected in implementation — required for any public-facing login.
- **Cloudflare Turnstile on the contact form** — The design's public contact form has no spam protection; without it the owner's inbox will fill with bot submissions.
- **Audit log of admin actions** — Multiple admins can edit content per the PDF; an audit trail is needed for accountability once more than one person can make changes.
- **Live data model instead of hardcoded animals** — The current design prototype hardcodes 11 sample animals in code; production needs the admin CRUD (already required by the PDF) to actually drive the displayed content.
- **Site settings for showPublicPrices / galleryStyle** — These already exist as design-time toggles in the prototype; making them admin-editable turns them into real, useful features rather than fixed at build time.
- **Accessibility (WCAG 2.1 AA), SEO basics, responsive/browser support, performance targets, backups** — Standard due-diligence requirements for any public marketing website, not explicitly stated in the PDF but expected for a professional launch.
- **Display order field for animals** — The PDF describes adding/editing/deleting animals but not controlling their presentation order in the grid.
- **CI test-coverage gate** — The PDF says "all necessary tests"; a coverage threshold makes that concrete and enforceable in CI.
- **Deployment approval gate (GitHub Environment required reviewer + per-PR preview environment)** — The owner wants to personally review every change before it reaches the live site; neither source document specified a review checkpoint before production deploy.
- **Defined Design Iteration / UX Change Workflow (Section 6.4)** — The visual source of truth lives in Claude Design, not the repo; without a defined pull/design/push/implement/CI loop, the design project and production code would drift apart over time.

## Change Log
Entries added here whenever implementation causes a requirement to change from what's documented above. Each entry should say what changed, why, and which section(s) were amended.

- **2026-07-20** — §7.2.2, §10, §15: Animal deletion is a soft delete (`deleted_at` timestamp) rather than a hard row delete. Decided ahead of implementation to support future recoverability/export needs without a schema change later.
