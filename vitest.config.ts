import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    // `server-only` throws outside a React Server build; in tests it is just a marker.
    alias: { 'server-only': fileURLToPath(new URL('./src/lib/__tests__/server-only-stub.ts', import.meta.url)) },
  },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
