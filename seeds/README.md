# Sample Data Seed

`sample-data.sql` — the 11 sample animals, their photos/video, and the 9 gallery photos from `design-reference/Scattered Oaks Farms.dc.html`, plus `site_settings` defaults.

Deliberately **separate from `migrations/`**: schema migrations are one-time and Wrangler-tracked (each applies exactly once); this seed needs to be safely re-runnable — reset local dev data, or reseed the preview D1 on every PR build (SDD.md §2.2). It's idempotent (`INSERT OR REPLACE`, deterministic IDs), so re-running it is always safe.

Run locally:

```
npm run seed:local
```

Image/video URLs currently point at `design-reference/uploads/...` paths as placeholders — those files haven't been pulled into R2 yet. Update once M4 (frontend) or M10 (real content) does that.
