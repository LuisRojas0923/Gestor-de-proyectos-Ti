import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
  },
  server: {
    host: true,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      '/api/v2': {
        target: 'http://backend:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
