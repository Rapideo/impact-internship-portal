import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // RLS tests hit a live DB; serialize all test files across projects so we
    // don't have parallel transactions racing on the same fake test rows.
    // (Unit tests are fast and unaffected.)
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['tests/e2e/**', 'tests/rls/**', 'tests/components/**', 'node_modules/**'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/components/**/*.{test,spec}.{ts,tsx}'],
          setupFiles: ['./tests/setup.ts', './tests/setup.dom.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
        },
      },
    ],
  },
});
