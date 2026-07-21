# Scattered Oaks Farms — Repo Instructions

Public marketing/animal-listing website + admin CMS for a miniature zebu farm. See `README.md` for the full architecture and `docs/Development-Plan.md` for the build sequence (milestones M1–M11).

## Living documentation — keep in sync with implementation

`docs/Requirements.md` and `docs/SDD.md` are the **living** specification. They started as a direct Markdown conversion of the original `.docx` deliverables (which remain in `docs/` untouched, as a frozen v1 baseline — never edit the `.docx` files again).

**Rule: whenever an implementation change makes something in `Requirements.md` or `SDD.md` inaccurate — a changed API contract, data model, auth flow, page/route, security behavior, CI/CD step, or scope decision — update the relevant section(s) of that document in the same change, and add a dated entry to the "Change Log" section at the bottom of whichever doc(s) you touched.** This applies from the first implementation commit onward, not just after the initial Development-Plan pass completes.

- Small implementation details that don't change documented behavior (variable names, internal refactors, code style) do **not** need a doc update.
- If a change also affects milestone scope or sequencing in `docs/Development-Plan.md` (e.g., a milestone's deliverable grew or shrank), update that too.
- Tag new/changed requirement or design lines with `[AMENDED]` plus the date, same convention as the existing `[PDF]`/`[DESIGN]`/`[ADDED]` provenance tags, so it's clear what changed after the original design phase and why (see the change-log entries already in both docs for the soft-delete example).
- If a change resolves one of the "Open Questions" in `Requirements.md` §15 or the "Open decisions" table in `Development-Plan.md`, mark it resolved there instead of leaving it open.

Do not treat this as optional cleanup to batch up later — a stale requirements/design doc is worse than no doc, since anyone (including a future session) will otherwise plan against it as if it were still accurate.

## Astro Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
