# Manual Setup Guide — Step by Step

This expands `SDD.md` §10 (Manual Configuration Checklist) into exact click-paths and commands. The **original item numbers** (`#1`–`#19`) are kept in parentheses next to each step so you can always trace back to the SDD; they're **reordered here by actual dependency** — e.g. you can't add `CLOUDFLARE_API_TOKEN` as a GitHub secret (SDD #5) until you've generated it in Cloudflare (SDD #9), so token creation comes first here.

Each step is tagged:
- **Do now** — no application code needed, safe to do today.
- **Needs code (M1+)** — requires the repo scaffold from Development-Plan.md M1 (a `wrangler.toml`, a connectable frontend) to complete fully. Do the account/resource-creation part now; finish the connection step once M1 lands.

## Resources Created
Non-secret values generated while working through this guide (2026-07-21) — everything M1's `wrangler.toml` needs. Secrets (API tokens, keys, passwords) are **not** repeated here; they live only in GitHub Actions secrets per Phase H.

| Resource | Value |
|---|---|
| Cloudflare account | `heather.a.johnston@gmail.com` (account id `78698cbd5aa89fdf32f89b0fd6e83db3`) |
| Cloudflare zone (`scattered-oaks-zebu.com`) | id `b99ecde44db22b440266502f51bab82c`, status `active` |
| D1 database `scattered-oaks-db` | id `347610ff-6871-4195-b102-9f071dcbddb0` |
| D1 database `scattered-oaks-db-preview` | id `713e4729-4c61-463b-b81f-1fb66b728542` |
| R2 bucket | `scattered-oaks-media` |
| R2 bucket (preview) | `scattered-oaks-media-preview` |
| R2 bucket (backups, `[ADDED]` 2026-07-23 M11) | `scattered-oaks-backups` — not bound to the Worker, only written by `.github/workflows/backup.yml` via `CLOUDFLARE_API_TOKEN`; deliberately separate from `scattered-oaks-media` since `workers/routes/media.ts` serves that bucket's contents publicly |
| Worker project | `scattered-oaks-farms` (connected to GitHub for domain binding only — auto-deploy-on-push disabled, see E1a) |
| Turnstile Site Key (public) | `0x4AAAAAAD6H-O_yKg6fVzMc` (also set as the GitHub Actions repo variable `PUBLIC_TURNSTILE_SITE_KEY` — see F1's "Site key delivery changed" note) |
| Resend sending domain | `mail.scattered-oaks-zebu.com` (verified) |

---

## Phase A — GitHub baseline
*(SDD #1, #2, #3, #4, #6 — no external values needed yet)*

**A1 (#1) — Confirm the repo is public.** Do now.
`github.com/ndibling/Scattered-Oaks-Web-Page` → **Settings** → **General** → scroll to **Danger Zone** → confirm visibility is **Public**. (Public is required for the free required-reviewer Environment protection used in A4 — that feature is paid on private repos.)

**A2 (#2) — Branch protection on `main`.** Do now.
**Settings** → **Branches** → **Add branch protection rule** → Branch name pattern: `main` → check:
- ☑ Require a pull request before merging
  - ☐ Leave the nested **"Require approvals"** box **unchecked**. `[AMENDED 2026-07-23 (M9)]` Found the hard way, on the very first real PR through this pipeline: GitHub does not let a PR's own author approve their own PR, so on a solo-maintainer repo this setting makes every PR permanently unmergeable through the normal UI — the "Merge" button stays blocked with no self-service way past it (short of an admin bypass merge every single time). It also isn't the gate that actually matters here: the real, working approval step is the required-reviewer click on the `production` GitHub Environment (A4), which fires independently of this checkbox. If this was already checked when M9's first PR got stuck, fix: **Settings** → **Branches** → edit the `main` rule → uncheck **Require approvals** → **Save changes**. Note also that this checkbox lives under **Settings → Branches**, not **Settings → General**'s "Pull Requests" merge-method section (squash/rebase/merge-commit options) — easy to land on the wrong page since both are called "Pull Requests"-adjacent settings.
- ☑ Require status checks to pass before merging *(you won't be able to pick specific check names until M9's CI workflow has run at least once — come back and select `build-and-test` then; for now just save with the box checked)*
→ **Create**.

**A3 (#3) — Create the two Environments.** Do now.
**Settings** → **Environments** → **New environment** → name it `preview` → **Configure environment** (no rules needed, Save). Repeat → name it `production`.

**A4 (#4) — Required reviewer on `production`.** Do now.
**Settings** → **Environments** → click **production** → under **Deployment protection rules**, check **Required reviewers** → add yourself (Nate) → **Save protection rules**.

**A5 (#6) — Confirm Actions is enabled.** Do now.
**Settings** → **Actions** → **General** → under **Actions permissions**, confirm **Allow all actions and reusable workflows** (or your preferred non-blocking option) is selected.

*(A6 — repository secrets, SDD #5 — comes later in Phase H, once the values below exist.)*

---

## Phase B — Cloudflare account & CLI access
*(SDD #7, #9 + Wrangler install, not separately numbered in the SDD)*

**B1 (#7) — Create/confirm a Cloudflare account.** Do now.
Sign up at `dash.cloudflare.com` if you don't already have an account.

**B2 (#9) — Create the scoped API token.** Do now.
Cloudflare dashboard → click your profile icon (top right) → **My Profile** → **API Tokens** → **Create Token** → **Custom token** → **Get started**.
- Token name: `scattered-oaks-ci`
- Permissions — add all of:
  - Account → Workers Scripts → Edit
  - Account → Cloudflare Pages → Edit
  - Account → D1 → Edit
  - Account → Workers R2 Storage → Edit
  - Zone → DNS → Edit
- Zone Resources: **Include** → **Specific zone** → `scattered-oaks-zebu.com` *(you can select this after Phase C creates the zone; if doing B2 before C1, choose "All zones" temporarily and narrow it once the zone exists)*
- **Continue to summary** → **Create Token** → **copy the token value now** — Cloudflare shows it exactly once. Paste it somewhere temporary; it goes into a GitHub secret in Phase H.

**B3 — Install Wrangler CLI locally.** Do now.
- Install Node.js LTS if you don't have it (`node -v` to check).
- `npm install -g wrangler`
- Authenticate either way:
  - Interactive: `wrangler login` (opens a browser OAuth flow), or
  - Non-interactive (recommended, matches what CI will do): set the token from B2 as an environment variable before running wrangler commands: `set CLOUDFLARE_API_TOKEN=<token-from-B2>` (Windows cmd) or `$env:CLOUDFLARE_API_TOKEN="<token-from-B2>"` (PowerShell).

---

## Phase C — DNS / Zone
*(SDD #8)*

**C1 (#8) — Add the domain as a Cloudflare zone.** Do now.
Cloudflare dashboard → **Domains** (left sidebar, account-level — not inside a Worker/Pages project) → **Onboard a domain** *(Cloudflare's 2026 rename of the older "Add a Site" button)* → enter `scattered-oaks-zebu.com` → choose the **Free** plan → Cloudflare scans existing DNS records → **Continue**. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com` — yours will be specific to this zone).
→ Go to whichever registrar the domain was purchased through → find **Nameservers** in that registrar's DNS/domain settings → replace the existing nameservers with the two Cloudflare gave you → save.
→ Back in Cloudflare, the zone shows **Pending Nameserver Update** until propagation completes (usually minutes, can take up to 24h). Wait for it to flip to **Active** before relying on anything DNS-dependent (Resend domain verification in Phase G needs this).

---

## Phase D — D1 databases & R2 buckets
*(SDD #10, #11 — Do now; the *contents* of these databases get populated in Development-Plan.md M2, but creating the empty resources doesn't need app code)*

**D1 (#10) — Create the D1 databases.**
```
wrangler d1 create scattered-oaks-db
wrangler d1 create scattered-oaks-db-preview
```
Each command prints a `database_id`. **Save both IDs** — once the repo has a `wrangler.toml` (Development-Plan.md M1), they go into the `d1_databases` binding block for the `production` and `preview` environments respectively. Until then, just keep them noted somewhere.

**D2 (#11) — Create the R2 buckets.**
```
wrangler r2 bucket create scattered-oaks-media
wrangler r2 bucket create scattered-oaks-media-preview
```

---

## Phase E — Worker project & custom domain
*(SDD #12, #13 — Needs code (M1+) to fully complete; the project can be created now, but its first build will fail until M1's scaffold exists)*

**E1 (#12) — Create the `scattered-oaks-farms` Worker project.** `[AMENDED 2026-07-21]` Cloudflare has consolidated the separate Pages product into a unified Workers deploy flow — there's no "Pages" tab or framework-preset dropdown anymore.
Cloudflare dashboard → **Workers & Pages** → **Create** → **Connect to Git** → authorize Cloudflare's GitHub App if prompted → select `Scattered-Oaks-Web-Page`. On the "Set up your application" screen, the form only asks for three things:
- **Project Name:** `scattered-oaks-farms`
- **Build Command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- Leave everything else default → **Save and Deploy**. If the repo has no buildable frontend/`wrangler.toml` yet, this first build fails — that's expected pre-M1; re-run it once M1 lands.

**E1a — Disable Workers Builds' Git auto-deploy.** `[AMENDED 2026-07-23 (M9)]` **Required, and found the hard way:** leaving "Connect to Git" active means Cloudflare deploys straight to production on every `git push` to `main`, with zero review — confirmed happening in practice for M6/M7/M8 (each push landed as a live production deployment within seconds, all of them broken, since production D1 never had migrations applied). This completely bypasses the required-reviewer gate in A4/§7.1 step 4; GitHub Actions (M9) is the only deploy path from here on.
Click into the `scattered-oaks-farms` project → **Settings** → **Build** → find the Git connection/auto-deploy trigger → disable automatic deployments on push (or fully disconnect the GitHub connection, whichever the current dashboard offers — Cloudflare's Workers Builds settings UI has moved around before, see the E2 note above for a precedent). The project stays connected for E2's custom-domain binding either way; only the build-on-push trigger needs to go.

**E2 (#13) — Bind the custom domain.** `[AMENDED 2026-07-21]` Cloudflare added a dedicated **Domains** tab directly on the Worker project's top ribbon (May 2026 update) — it's not nested under Settings.
Click into the `scattered-oaks-farms` project → click the **Domains** tab (top ribbon, left of Settings) → **Add** (or **+ Add domain**) → enter `scattered-oaks-zebu.com` (bare domain, no `https://`, no `www`) → confirm. Since the zone is already in this same Cloudflare account (Phase C), the DNS record and SSL certificate are provisioned automatically.

If you get an error about a conflicting DNS record already existing for that hostname, go to the zone → **DNS** → **Records**, delete the existing record for the root domain (or `www`), and retry.

---

## Phase F — Turnstile
*(SDD #14 — Do now)*

**F1 (#14) — Register a Turnstile widget.** `[AMENDED 2026-07-21]` The field for authorized domains is labeled **Hostname**, not "Domains," and Turnstile doesn't support wildcards — see below.
Cloudflare dashboard → **Turnstile** → **Add widget**.
- Widget name: `Scattered Oaks Contact Form`
- Hostname: `scattered-oaks-zebu.com` — enter as a bare fully-qualified domain (no `http://`, no port, no wildcard like `*.example.com`). At least one hostname is required to create the widget.
- Widget mode: **Managed** (recommended default)
- **Create**
→ Copy the **Site Key** (public — goes into the frontend contact-form component in M7) and the **Secret Key** (goes into a GitHub secret in Phase H, then a Worker secret — see the note on secret handling in Phase H1).

**Preview-domain hostname deferred — and now, deliberately, indefinitely.** `[AMENDED 2026-07-23 (M9)]` The original plan was to authorize the `*.pages.dev`/preview-URL hostname so the contact form works on PR previews, but M9's `preview-deploy` CI job intentionally never sets `PUBLIC_TURNSTILE_SITE_KEY` at build time — `src/lib/turnstile.ts` falls back to Cloudflare's published always-pass dummy sitekey instead. That sidesteps needing to register every ephemeral preview URL as a Turnstile hostname at all; no action needed here unless a stable, permanent preview domain is ever adopted.

**Site key delivery changed.** `[AMENDED 2026-07-23 (M9)]` SDD.md §10.2 item 14 originally had the Site Key set as a Cloudflare Workers Builds build-time environment variable (Worker project → Settings → Build → Variables). Since E1a disables Workers Builds' auto-deploy, that delivery path no longer runs at all — GitHub Actions builds the site now. Instead, add a GitHub Actions repository **Variable** (Settings → Secrets and variables → Actions → **Variables** tab, not Secrets — this value is public): name `PUBLIC_TURNSTILE_SITE_KEY`, value `0x4AAAAAAD6H-O_yKg6fVzMc`. The `deploy` (production) job reads it at build time; the `preview-deploy` job deliberately does not, per the paragraph above.

---

## Phase G — Resend
*(SDD #16, #17, #18 — Do now, once Phase C's zone is Active)*

**G1 (#16) — Create a Resend account.**
Sign up at `resend.com`.

**G2 (#17) — Add and verify the sending domain.** `[AMENDED 2026-07-21]` Domain confirmed as `mail.scattered-oaks-zebu.com` (was an open question — see `Requirements.md` §15); also, Resend's "Domain" field takes this subdomain directly (Resend doesn't distinguish domains from subdomains), and since the zone's already on Cloudflare, prefer the **Auto configure** path over manual record entry.
Resend dashboard → **Domains** → **Add Domain** → enter `mail.scattered-oaks-zebu.com`.
- Choose **Auto configure** → click **Sign in to Cloudflare** → log in with the same Cloudflare account (`heather.a.johnston@gmail.com`) → authorize. Resend adds the SPF/DKIM/MX records directly to the zone — nothing to copy/paste. Wait for the domain to show **Verified** (usually a few minutes).
- Fallback if Auto configure isn't available: choose **Manual setup** instead, then go to Cloudflare dashboard → your zone → **DNS** → **Records** → **Add record** for each one Resend displays (SPF `TXT`, DKIM `CNAME`/`TXT`, DMARC `TXT`), matching type/name/content exactly, then click **Verify DNS Records** back in Resend.

**G3 (#18) — Generate the API key.**
Resend dashboard → **API Keys** → **Create API Key** → name `scattered-oaks-prod` → Permission: **Sending access**, scoped to the domain from G2 → **Add** → copy the key value now (shown once).

---

## Phase H — Push every secret into place
*(Closes out SDD #5 and #15)*

> **On secret values generally:** paste these directly into the destination form (GitHub's secret UI, a `wrangler secret put` prompt) rather than into a chat with an AI assistant or anywhere else — the assistant only needs to know a secret was added, never the value itself.

**H1 — Choose the Root bootstrap password.** Do now.
Pick a password meeting the site's own policy (`Requirements.md` §7.2.4: 8+ chars, at least one number, one lowercase, one uppercase, one special character). This is a one-time seed value — you'll log in with it once (Phase I) and immediately change it, so a password manager's random generator is ideal here.

**H2 (#5) — Add the four GitHub Actions secrets.**
`github.com/ndibling/Scattered-Oaks-Web-Page` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, one at a time:

| Secret name | Value from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Phase B2 |
| `RESEND_API_KEY` | Phase G3 |
| `TURNSTILE_SECRET_KEY` | Phase F1 |
| `ROOT_ADMIN_BOOTSTRAP_PASSWORD` | Phase H1 |

**H3 (#15) — Push secrets to the Cloudflare Worker.** `[AMENDED 2026-07-23 (M9)]` **Now automated — nothing to do here by hand.** The `deploy` job in `.github/workflows/ci.yml` runs `wrangler secret put` for `RESEND_API_KEY`/`TURNSTILE_SECRET_KEY` from the GitHub secret values (H2) on every production deploy — idempotent, so it can never drift from what's in GitHub. This also corrects a real bug the original manual commands had: `wrangler.toml`'s production config is the **top-level/default** environment (no `[env.production]` section exists — see its own header comment), so `wrangler secret put RESEND_API_KEY --env production` as originally written here would fail with "No environment found in configuration with name production." CI runs the production pushes with no `--env` flag and the preview equivalent (`--env preview`) only if a preview Worker secret is ever needed (not currently — preview uses Turnstile's dummy test secret key, which needs no `wrangler secret put` at all).
~~```
wrangler secret put RESEND_API_KEY --env production
wrangler secret put RESEND_API_KEY --env preview
wrangler secret put TURNSTILE_SECRET_KEY --env production
wrangler secret put TURNSTILE_SECRET_KEY --env preview
```~~ *(superseded — do not run these by hand; CI does the production pushes now)*

---

## Phase I — Root Administrator
*(SDD #19 — after the first successful production deploy, i.e. after Development-Plan.md M11)*

`[AMENDED 2026-07-23 (M9)]` The production Root account itself is now also created automatically — `scripts/seed-root-admin.ts` runs as a step in the `deploy` CI job, hashing `ROOT_ADMIN_BOOTSTRAP_PASSWORD` (H1/H2) with the real production password-hashing code and inserting the row (idempotent — a no-op on every deploy after the first). Username `Root`, email `nate.dibling@gmail.com`, `force_password_change=1`. Nothing to do here manually before I1.

**I1 (#19) — First login and password rotation.**
1. Go to `https://scattered-oaks-zebu.com/admin/login`.
2. Log in with username `Root` and the password from Phase H1.
3. The forced first-login change screen appears (per `Requirements.md` §7.2.4) — set a new, permanent password there and store it in your password manager.
4. Go back to the GitHub secret `ROOT_ADMIN_BOOTSTRAP_PASSWORD` (Phase H2) and **update its value** to a fresh random string (it's a one-time seed value, never used again after this — rotating it just makes sure the original bootstrap password isn't sitting in GitHub's secret store indefinitely).

---

## Quick reference — all 19 SDD items, in this guide's order

| Guide step | SDD # | What |
|---|---|---|
| A1 | 1 | Repo is public |
| A2 | 2 | Branch protection on `main` |
| A3 | 3 | Create `preview`/`production` Environments |
| A4 | 4 | Required reviewer on `production` |
| A5 | 6 | Actions enabled |
| B1 | 7 | Cloudflare account |
| B2 | 9 | Scoped API token |
| C1 | 8 | Zone + nameservers |
| D1 | 10 | D1 databases |
| D2 | 11 | R2 buckets |
| E1 | 12 | Worker project (`scattered-oaks-farms`) |
| E2 | 13 | Custom domain bound |
| F1 | 14 | Turnstile widget |
| G1 | 16 | Resend account |
| G2 | 17 | Resend domain verified |
| G3 | 18 | Resend API key |
| E1a | — | Workers Builds auto-deploy disabled `[ADDED M9]` |
| H2 | 5 | GitHub secrets added |
| H3 | 15 | Worker secrets pushed — automated via CI `[AMENDED M9]` |
| — | — | GitHub Actions variable `PUBLIC_TURNSTILE_SITE_KEY` added `[ADDED M9]` |
| I1 | 19 | Root login + rotation |
