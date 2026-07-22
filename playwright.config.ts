import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    // wrangler dev (port 8787), not astro dev (4321) — since M4, the visitor
    // flow needs the real /api/* Worker too, not just the static Astro shell.
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
  },
  // No webServer auto-launch: `astro dev` auto-daemonizes into background mode in
  // this environment (see CLAUDE.md's Astro Development section), which exits the
  // foreground process Playwright expects to manage — incompatible with Playwright's
  // spawn-and-wait webServer feature. Same issue applies to wrangler dev. Start the
  // stack yourself first:
  //   npm run build && npx wrangler dev
  // then run `npm run test:e2e`. CI (M9) starts it the same way before this step.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
