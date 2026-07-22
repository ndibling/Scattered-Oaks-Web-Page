import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Two projects with incompatible test environments:
    // - "unit": plain Node (migrations/schema tests via node:sqlite)
    // - workers/vitest.config.ts: the actual Cloudflare Workers runtime
    //   (Miniflare), for integration tests against the real Worker + D1
    //   bindings (SDD §8). Vitest 4 replaced vitest.workspace.ts with this.
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'migrations/**/*.test.ts'],
          passWithNoTests: true,
        },
      },
      './workers/vitest.config.ts',
    ],
  },
});
