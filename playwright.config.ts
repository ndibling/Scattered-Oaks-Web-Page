import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  // No webServer auto-launch: `astro dev` auto-daemonizes into background mode in
  // this environment (see CLAUDE.md's Astro Development section), which exits the
  // foreground process Playwright expects to manage — incompatible with Playwright's
  // spawn-and-wait webServer feature. Start the dev server yourself first:
  //   astro dev --background   (see CLAUDE.md)
  // then run `npm run test:e2e`. CI (M9) starts it the same way before this step.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
