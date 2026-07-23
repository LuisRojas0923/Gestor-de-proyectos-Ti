import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import nominaApi from './nominaApi';
import { AuthService } from './AuthService';

describe('nominaApi', () => {
  const originalAdapter = nominaApi.defaults.adapter;

  beforeEach(() => {
    localStorage.setItem('token', 'token-nomina');
  });

  afterEach(() => {
    localStorage.clear();
    nominaApi.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('agrega Authorization a consultas y descargas blob', async () => {
    let captured: InternalAxiosRequestConfig | undefined;
    nominaApi.defaults.adapter = async (config) => {
      captured = config;
      return {
        data: new Blob(['archivo']),
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    await nominaApi.get('/api/v2/novedades-nomina/archivos/1/descargar', {
      responseType: 'blob',
    });

    expect(captured?.headers.get('Authorization')).toBe('Bearer token-nomina');
    expect(captured?.responseType).toBe('blob');
  });

  it('conserva Authorization al enviar FormData', async () => {
    let captured: InternalAxiosRequestConfig | undefined;
    nominaApi.defaults.adapter = async (config) => {
      captured = config;
      return {
        data: { id: 1 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    await nominaApi.post('/api/v2/novedades-nomina/archivos', new FormData());

    expect(captured?.headers.get('Authorization')).toBe('Bearer token-nomina');
  });

  it('agrega Authorization al enviar JSON', async () => {
    let captured: InternalAxiosRequestConfig | undefined;
    nominaApi.defaults.adapter = async (config) => {
      captured = config;
      return {
        data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config,
      } as AxiosResponse;
    };

    await nominaApi.post('/api/v2/novedades-nomina/exportar-solid', { mes: 7 });

    expect(captured?.headers.get('Authorization')).toBe('Bearer token-nomina');
  });

  it('no filtra el token a una URL externa con nombre similar', async () => {
    let captured: InternalAxiosRequestConfig | undefined;
    nominaApi.defaults.adapter = async (config) => {
      captured = config;
      return {
        data: {}, status: 200, statusText: 'OK', headers: {}, config,
      } as AxiosResponse;
    };

    await nominaApi.get('https://example.com/novedades-nomina/catalogo');

    expect(captured?.headers.get('Authorization')).toBeUndefined();
  });

  it('reintenta una vez con el token renovado después de 401', async () => {
    let calls = 0;
    let retried: InternalAxiosRequestConfig | undefined;
    vi.spyOn(AuthService, 'refreshAccessToken').mockResolvedValue('token-renovado');
    nominaApi.defaults.adapter = async (config) => {
      calls += 1;
      if (calls === 1) {
        throw new AxiosError(
          'Unauthorized',
          'ERR_BAD_REQUEST',
          config,
          undefined,
          { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config },
        );
      }
      retried = config;
      return {
        data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config,
      } as AxiosResponse;
    };

    await nominaApi.get('/api/v2/novedades-nomina/catalogo');

    expect(calls).toBe(2);
    expect(retried?.headers.get('Authorization')).toBe('Bearer token-renovado');
  });
});
