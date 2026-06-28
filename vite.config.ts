

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Custom plugin to fix a bug in @capgo/capacitor-updater
 * which attempts to import a .d.ts file at runtime.
 */
const fixCapacitorUpdater = () => {
  return {
    name: 'fix-capacitor-updater',
    resolveId(id: string) {
      if (id === 'capacitor-cli.d.ts') {
        return id;
      }
      return null;
    },
    load(id: string) {
      if (id === 'capacitor-cli.d.ts') {
        return 'export default {};';
      }
      return null;
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    fixCapacitorUpdater()
  ],
  base: './', 
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3005', 
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Fix: Move 'capacitor-cli.d.ts' to exclude instead of esbuildOptions.external.
    // 'external' is not a valid property in optimizeDeps.esbuildOptions according to Vite types.
    exclude: ['capacitor-cli.d.ts']
  },
  build: {
    rollupOptions: {
      external: ['capacitor-cli.d.ts'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    css: false,
  },
});
