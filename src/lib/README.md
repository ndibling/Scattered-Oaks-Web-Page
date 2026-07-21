# Shared Client Code

- `tokens.ts` — the single shared design-tokens module (SDD.md §3.3): OKLCH colors, Quicksand/Nunito font stack, spacing/radius conventions, extracted from `design-reference/Scattered Oaks Farms.dc.html`. Every component (public or admin) imports from here — it's the one file a future Design Iteration Workflow update (Requirements.md §6.4) needs to touch to restyle the whole site consistently.
- API client helpers for calling `workers/` endpoints land here as they're built (M3+).
