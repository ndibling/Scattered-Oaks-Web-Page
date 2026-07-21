# Manual Setup Guide — Step by Step

This expands `SDD.md` §10 (Manual Configuration Checklist) into exact click-paths and commands. The **original item numbers** (`#1`–`#19`) are kept in parentheses next to each step so you can always trace back to the SDD; they're **reordered here by actual dependency** — e.g. you can't add `CLOUDFLARE_API_TOKEN` as a GitHub secret (SDD #5) until you've generated it in Cloudflare (SDD #9), so token creation comes first here.

Each step is tagged:
- **Do now** — no application code needed, safe to do today.
- **Needs code (M1+)** — requires the repo scaffold from Development-Plan.md M1 (a `wrangler.toml`, a connectable frontend) to complete fully. Do the account/resource-creation part now; finish the connection step once M1 lands.

---

## Phase A — GitHub baseline
*(SDD #1, #2, #3, #4, #6 — no external values needed yet)*

**A1 (#1) — Confirm the repo is public.** Do now.
`github.com/ndibling/Scattered-Oaks-Web-Page` → **Settings** → **General** → scroll to **Danger Zone** → confirm visibility is **Public**. (Public is required for the free required-reviewer Environment protection used in A4 — that feature is paid on private repos.)

**A2 (#2) — Branch protection on `main`.** Do now.
**Settings** → **Branches** → **Add branch protection rule** → Branch name pattern: `main` → check:
- ☑ Require a pull request before merging
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

**E2 (#13) — Bind the custom domain.**
The `scattered-oaks-farms` project → **Custom domains** tab → **Set up a custom domain** → enter `scattered-oaks-zebu.com` → **Continue** → **Activate domain**. Since the zone is already in this same Cloudflare account (Phase C), the DNS record is created automatically — no manual CNAME needed.

---

## Phase F — Turnstile
*(SDD #14 — Do now)*

**F1 (#14) — Register a Turnstile widget.**
Cloudflare dashboard → **Turnstile** → **Add widget**.
- Widget name: `Scattered Oaks Contact Form`
- Domains: `scattered-oaks-zebu.com` **and** your `*.pages.dev` preview domain (so the contact form works on PR previews too)
- Widget mode: **Managed** (recommended default)
- **Create**
→ Copy the **Site Key** (public — goes into the frontend contact-form component in M7) and the **Secret Key** (goes into a GitHub secret in Phase H, then a Worker secret).

---

## Phase G — Resend
*(SDD #16, #17, #18 — Do now, once Phase C's zone is Active)*

**G1 (#16) — Create a Resend account.**
Sign up at `resend.com`.

**G2 (#17) — Add and verify the sending domain.**
Resend dashboard → **Domains** → **Add Domain** → enter your chosen sending subdomain (e.g. `mail.scattered-oaks-zebu.com` — see the open question in `Requirements.md` §15 if this isn't finalized yet). Resend displays the required DNS records (SPF `TXT`, DKIM `CNAME`/`TXT`, DMARC `TXT`).
→ Cloudflare dashboard → your zone → **DNS** → **Records** → **Add record** for each one, matching type/name/content exactly as Resend shows it.
→ Back in Resend, click **Verify DNS Records**. This can take a few minutes to propagate; retry verification if it doesn't pass immediately.

**G3 (#18) — Generate the API key.**
Resend dashboard → **API Keys** → **Create API Key** → name `scattered-oaks-prod` → Permission: **Sending access**, scoped to the domain from G2 → **Add** → copy the key value now (shown once).

---

## Phase H — Push every secret into place
*(Closes out SDD #5 and #15)*

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

**H3 (#15) — Push secrets to the Cloudflare Workers.** Needs code (M1+) — the Worker (`scattered-oaks-api` / `scattered-oaks-api-preview`) must exist first, which happens once `wrangler.toml` and the API code land in M1/M3.
```
wrangler secret put RESEND_API_KEY --env production
wrangler secret put RESEND_API_KEY --env preview
wrangler secret put TURNSTILE_SECRET_KEY --env production
wrangler secret put TURNSTILE_SECRET_KEY --env preview
```
Each command prompts you to paste the value interactively — nothing is typed on the command line or saved to shell history.

---

## Phase I — Root Administrator
*(SDD #19 — after the first successful production deploy, i.e. after Development-Plan.md M11)*

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
| H2 | 5 | GitHub secrets added |
| H3 | 15 | Worker secrets pushed |
| I1 | 19 | Root login + rotation |
