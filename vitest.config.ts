import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // [AMENDED] 2026-07-23 (M8) — was 'v8'. Cloudflare's own docs:
      // "Native code coverage via V8 is not supported [in the Workers
      // pool]. You must use instrumented code coverage via Istanbul
      // instead." Confirmed directly: v8 coverage made every
      // workers/**/*.test.ts file throw `No such module
      // "node:inspector/promises"` (that module doesn't exist in the
      // workerd runtime). Istanbul instruments at the source-transform
      // step instead of hooking Node's inspector protocol, so it works
      // inside workerd too.
      provider: 'istanbul',
      reporter: ['text', 'html'],
      // Explicit allowlist rather than relying on "only files a test
      // imports get instrumented" as implicit behavior — guards against a
      // future test accidentally pulling in a .tsx component (no jsdom
      // harness exists for those) and silently dragging the threshold
      // down. src/lib/tokens.ts (pure design-token data, nothing to
      // exercise) and src/lib/useFocusTrap.ts (DOM-only, no test harness)
      // are deliberately left out.
      include: [
        'workers/**/*.ts',
        'src/lib/api.ts',
        'src/lib/imageResize.ts',
        'src/lib/turnstile.ts',
      ],
      exclude: [
        '**/*.test.ts',
        'workers/vitest.config.ts',
        'workers/vitest.setup.ts',
        'workers/types.ts',
      ],
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
