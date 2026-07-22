# Administrator Components

The `/admin` SPA (SDD.md §3.1, §3.2) — new components not present in the public-only design prototype: AdminLogin, AdminShell, AnimalEditor, ContentEditor, GalleryEditor, SiteSettingsPanel, AdminUserManager, AuditLogView, AdminForcePasswordChange, AdminResetPassword, FileDropZone.

Built in M6 (Development-Plan.md), alongside the admin API endpoints in `workers/`. `AdminShell` (mounted from `src/pages/admin.astro`) manages every authenticated view as internal state — the one exception is `AdminResetPassword` (`src/pages/admin/reset-password.astro`), a real separate page since it's reached via an emailed link rather than in-app navigation.
