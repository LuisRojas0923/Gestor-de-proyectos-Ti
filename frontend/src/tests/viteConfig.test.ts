// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { createViteConfig } from '../../vite.config';

const originalPolling = process.env.VITE_USE_POLLING;
const originalInterval = process.env.VITE_POLLING_INTERVAL_MS;

afterEach(() => {
  if (originalPolling === undefined) delete process.env.VITE_USE_POLLING;
  else process.env.VITE_USE_POLLING = originalPolling;
  if (originalInterval === undefined) delete process.env.VITE_POLLING_INTERVAL_MS;
  else process.env.VITE_POLLING_INTERVAL_MS = originalInterval;
});

describe('vite development performance config', () => {
  it('permite desactivar polling y configurar su intervalo', () => {
    process.env.VITE_USE_POLLING = 'false';
    process.env.VITE_POLLING_INTERVAL_MS = '2500';

    const config = createViteConfig('development');

    expect(config.server?.watch).toMatchObject({
      usePolling: false,
      interval: 2500,
      ignored: ['**/dist/**', '**/coverage/**'],
    });
  });

  it('usa fallback seguro y limita el warmup a las rutas focales', () => {
    process.env.VITE_USE_POLLING = 'true';
    process.env.VITE_POLLING_INTERVAL_MS = 'invalid';

    const config = createViteConfig('development');

    expect(config.server?.watch?.interval).toBe(2000);
    expect(config.server?.warmup?.clientFiles).toHaveLength(4);
    expect(config.optimizeDeps?.holdUntilCrawlEnd).toBe(false);
  });
});
