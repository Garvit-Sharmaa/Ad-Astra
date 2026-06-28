

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
<<<<<<< HEAD
        target: 'http://localhost:3005', 
        changeOrigin: true,
=======
        // Updated to port 3004 based on user's server logs indicating the server started there.
        target: 'http://localhost:3005', 
        changeOrigin: true, // Recommended for virtual hosts
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
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
