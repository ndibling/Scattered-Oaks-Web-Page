# Scattered Oaks Farms — Website

Public marketing and animal-listing website for **Scattered Oaks Farms**, a miniature zebu breeding operation (a DBA of Heather Johnston) in Bradenton, Florida, plus an administrator content-management capability so the herd listing, photos, and site text can be kept current without a developer.

Live domain (once deployed): **scattered-oaks-zebu.com**

## Status

📐 **Design phase complete — implementation not yet started.** The two documents in [`docs/`](./docs) are the full specification this project will be built against:

| Document | What it defines |
|---|---|
| [Requirements Specification (v2.1)](./docs/Scattered%20Oaks%20Farm%20Requirements%20v2.docx) | What the site must do — public site behavior, the Administrator CMS, security/password policy, the deployment approval gate, and the design-iteration workflow. Combines the original owner-authored requirements with everything defined in the approved Claude Design prototype, plus additional requirements identified during analysis (each tagged `[PDF]` / `[DESIGN]` / `[ADDED]` for provenance). |
| [Software Design Description (v1.0)](./docs/Scattered%20Oaks%20Farm%20Software%20Design%20Description.docx) | How it will be built — concrete architecture, frontend/backend component design, the D1 data model, the full API contract, security design, the CI/CD pipeline, testing strategy, and a step-by-step manual configuration checklist for everything that has to be set up by hand in GitHub, Cloudflare, and Resend before the pipeline can run. |

Read the SDD's **Section 10 (Manual Configuration Checklist)** before any implementation work begins — it's the ordered, one-time setup (branch protection, GitHub Environments, Cloudflare resources, DNS, Turnstile, Resend) that everything else depends on.

## Planned Architecture

Fully Cloudflare-native, deployed from this one GitHub repository — no separate hosting provider.

| Layer | Technology |
|---|---|
| Frontend | [Astro](https://astro.build) + React/Preact islands (static-first, minimal shipped JS) |
| Hosting / CDN | Cloudflare Pages (public site + `/admin`, automatic per-PR preview deployments) |
| API | Cloudflare Workers |
| Database | Cloudflare D1 |
| Media storage | Cloudflare R2 |
| Bot protection | Cloudflare Turnstile |
| Transactional email | [Resend](https://resend.com) (password reset, admin invite) |
| CI/CD | GitHub Actions + Wrangler |
| Testing | Vitest (`@cloudflare/vitest-pool-workers`) + Playwright |

## Design Reference

The site's visual design lives in a Claude Design project, not in this repo. Future UX/visual changes follow the loop defined in the Requirements doc §6.4:

**Pull** the current implemented state into Claude Design → **Design** the change there → **Push** the updated design file(s) back into this repo → **Implement** the change in the actual frontend code → standard **CI/CD pipeline** (PR → tests → preview → approval → production).

## Deployment Approval Gate

No merge to `main` deploys straight to production. Every change goes through: PR → automated tests → a live per-PR preview environment (Cloudflare Pages preview + a mirrored preview Worker/D1) → a required-reviewer approval on a GitHub `production` Environment → production deploy. Full detail in Requirements §11.1 and SDD §7.

## Contributing / Getting Started

There's no application code yet — start with the SDD, particularly:

1. §10 — Manual Configuration Checklist (GitHub, Cloudflare, Resend one-time setup)
2. §2–§6 — Architecture, Frontend, Backend/API, and Data Design, before writing any code
3. §7–§9 — CI/CD, Testing Strategy, and Deployment & Infrastructure Design
