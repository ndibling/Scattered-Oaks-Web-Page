# Design Reference

Pulled from the Claude Design project "Scattered Oaks Farms website design" (project ID `a8493b50-0e7e-46e9-a0ef-930263d1a0c8`) on 2026-07-21, per the Pull→Design→Push→Implement→CI workflow in `Requirements.md` §6.4.

This is **read-only reference for implementation** — never edited by hand, never the production source. When the design changes upstream in Claude Design, this folder gets re-pulled (whole file, since the source is a single-page prototype rather than discrete components).

## Files

- **`Scattered Oaks Farms.dc.html`** — the binding visual/interaction spec (Requirements.md §6). Written in Claude Design's pseudo-component syntax (`<sc-for>`, `<sc-if>`, `{{ }}` bindings, a `DCLogic` component class) — not directly runnable, and not meant to be. M1 extracts the design tokens (OKLCH colors, Quicksand/Nunito type, spacing/radius) from this file's `<style>` block into Astro's shared tokens module (SDD.md §3.3); M4 rebuilds each section as a real Astro/React component reproducing this markup's visual/interaction behavior exactly.
- Also contains the 11 sample animals' data shape (name, type, sex, age, status, price, blurb, photos) and the 9 gallery photo captions — useful as a reference for the seed data in Development-Plan.md's M2, though the _real_ 38-head herd (M10) replaces these.

## Not pulled

- **`Scattered Oaks Logo.dc.html`** — a logo-concept mood board (14 labeled options, "Turn 1–4"), not the final design. The actual logo already in use is `uploads/Scattered Oaks Logo-eb6f247a.png` / `Scattered Oaks Logo.png`, referenced directly by the main design file above. Skipped here since it's exploratory history, not something implementation needs to reproduce.
- **`support.js`** — Claude Design's own runtime for the pseudo-component syntax (`DCLogic`, `sc-for`/`sc-if` rendering). Not applicable outside the design tool.

## Uploaded media

The Claude Design project's `uploads/` folder has **real farm photography already**, not placeholders — named to match the 11 sample animals (`Daisy.jpg`, `Molly.jpg`, `Samson.jpg`, etc.), plus a video, lifestyle/gallery shots, and the real logo PNG. Worth pulling directly into R2 for the real herd content (M10) rather than assuming new photography is still needed — see the note added to `Development-Plan.md`.
