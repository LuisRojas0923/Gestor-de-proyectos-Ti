import { useCallback, useEffect, useState } from 'react';
import {
  ensureStoredBuildId,
  getStoredBuildId,
  shouldShowUpdate,
  VERSION_POLL_INTERVAL_MS,
} from '../utils/appVersion';

interface VersionManifest {
  buildId?: string;
}

export function useAppVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch(`/version.json?_=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return;

      const data = (await response.json()) as VersionManifest;
      const localBuildId = getStoredBuildId();
      if (shouldShowUpdate(data.buildId, localBuildId)) {
        setUpdateAvailable(true);
      }
    } catch {
      // Red o version.json ausente en dev: ignorar
    }
  }, []);

  useEffect(() => {
    ensureStoredBuildId();
    if (import.meta.env.DEV) return;

    void checkVersion();

    const intervalId = window.setInterval(() => {
      void checkVersion();
    }, VERSION_POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkVersion]);

  const reloadApp = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateAvailable, reloadApp };
}
