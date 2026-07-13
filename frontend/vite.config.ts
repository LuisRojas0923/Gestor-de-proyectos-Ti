import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const DEFAULT_POLLING_INTERVAL_MS = 2000;

export const createViteConfig = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const pollingInterval = Number.parseInt(
    env.VITE_POLLING_INTERVAL_MS || String(DEFAULT_POLLING_INTERVAL_MS),
    10,
  );

  return {
    plugins: [react()],
    define: {
      __APP_BUILD_ID__: JSON.stringify(process.env.BUILD_SHA ?? 'dev'),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'],
    },
    server: {
      host: true,
      strictPort: true,
      watch: {
        usePolling: env.VITE_USE_POLLING === 'true',
        interval: Number.isFinite(pollingInterval) && pollingInterval > 0
          ? pollingInterval
          : DEFAULT_POLLING_INTERVAL_MS,
        ignored: ['**/dist/**', '**/coverage/**'],
      },
      hmr: {
        clientPort: 5173,
      },
      warmup: {
        clientFiles: [
          './src/services/horariosRelacionesService.ts',
          './src/pages/ServicePortal/pages/HORAS_EXTRAS/components/WeeklyScheduleEditor.tsx',
          './src/pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/components/AplicarPlantillaModal.tsx',
          './src/pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/components/PlantillaEditorModal.tsx',
        ],
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
      holdUntilCrawlEnd: false,
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => createViteConfig(mode));
