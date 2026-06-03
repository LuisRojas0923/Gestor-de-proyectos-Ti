/**
 * Helpers para manejo de errores type-safe.
 *
 * Sustituye `catch (err: any)` por `catch (err: unknown)` y `getErrorMessage(err)`
 * para evitar la "fobia al any" del skill frontend y mantener el tipado estricto.
 */

export function getErrorMessage(err: unknown, fallback = 'Ha ocurrido un error inesperado.'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

/**
 * Extrae el `detail` de un error de Axios sin usar `any`.
 * Devuelve `null` si no es un error de Axios o no tiene detail.
 */
export function getAxiosDetail(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as { response?: { data?: { detail?: unknown } } };
  const detail = e.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return null;
}
