import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This allows the server to be accessible on your local network
    host: true,
    // This proxy is essential for development in environments like AI Studio
    // to seamlessly connect the frontend to the backend API.
    proxy: {
      '/api': {
        // Updated to port 3004 based on user's server logs indicating the server started there.
        target: 'http://localhost:3004', 
        changeOrigin: true, // Recommended for virtual hosts
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    // Disable CSS parsing to speed up tests, as we are not testing styles.
    css: false,
  },
});