import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API_CONFIG } from '../config/api';
import { AuthService } from './AuthService';

type RetryableConfig = InternalAxiosRequestConfig & { _retriedWithRefresh?: boolean };

const nominaApi = axios;

function isNominaRequest(url?: string): boolean {
  if (!url) return false;
  const origin = window.location.origin;
  const apiBase = new URL(API_CONFIG.BASE_URL, origin);
  const target = new URL(url, origin);
  const apiPath = apiBase.pathname.replace(/\/$/, '');
  return target.origin === apiBase.origin
    && target.pathname.startsWith(`${apiPath}/novedades-nomina/`);
}

nominaApi.interceptors.request.use((config) => {
  if (!isNominaRequest(config.url)) return config;
  config.timeout ??= API_CONFIG.TIMEOUT;
  const token = localStorage.getItem('token');
  if (token && !(config as RetryableConfig)._retriedWithRefresh) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

nominaApi.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (
      error.response?.status === 401
      && isNominaRequest(config?.url)
      && !config._retriedWithRefresh
    ) {
      config._retriedWithRefresh = true;
      const token = await AuthService.refreshAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        return nominaApi(config);
      }
    }
    return Promise.reject(error);
  },
);

export default nominaApi;
