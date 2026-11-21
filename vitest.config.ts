import { defineConfig } from 'vitest/config';

/** The tests that time the machine they run on (benchmarks): run after the others, alone. */
const BENCH = 'src/**/{*-bench,bench-*}.test.ts';

// la-gram's unit configuration without what only its application needs: no path aliases (the kernel's
// modules import each other relatively) and no jsdom shims (they fill gaps for diagram-js). Node is the
// environment, as it is for these tests in la-gram.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'src/**/*.property.test.ts'],
          exclude: [BENCH],
          sequence: { groupOrder: 0 },
        },
      },
      {
        extends: true,
        test: { name: 'timing', include: [BENCH], sequence: { groupOrder: 1 } },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.property.test.ts'],
    },
  },
});
