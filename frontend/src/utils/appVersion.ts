export const APP_BUILD_SESSION_KEY = 'app_build_id';
export const VERSION_POLL_INTERVAL_MS = 5 * 60 * 1000;
export const CHUNK_ERROR_RELOAD_MS = 2000;

export function getAppBuildId(): string {
  return typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
}

export function shouldShowUpdate(
  remoteBuildId: string | undefined,
  localBuildId: string,
): boolean {
  if (!remoteBuildId) return false;
  return remoteBuildId !== localBuildId;
}

export function isChunkLoadError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('loading chunk') ||
    lower.includes('importing a module script failed')
  );
}

export function getStoredBuildId(): string {
  return sessionStorage.getItem(APP_BUILD_SESSION_KEY) ?? getAppBuildId();
}

export function ensureStoredBuildId(): string {
  const existing = sessionStorage.getItem(APP_BUILD_SESSION_KEY);
  if (existing) return existing;
  const buildId = getAppBuildId();
  sessionStorage.setItem(APP_BUILD_SESSION_KEY, buildId);
  return buildId;
}
