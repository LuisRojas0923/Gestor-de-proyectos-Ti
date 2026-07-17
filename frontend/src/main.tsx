import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import axios from 'axios';

const viteApiUrl = import.meta.env.VITE_API_BASE_URL || '';
const _API_BASE = (() => {
  try {
    return new URL(viteApiUrl, window.location.origin);
  } catch {
    return new URL(window.location.origin);
  }
})();
// Asegurar slash al final para comparación estricta de rutas
const _API_PREFIX = _API_BASE.pathname.endsWith('/') ? _API_BASE.pathname : `${_API_BASE.pathname}/`;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (!token || !config.headers) return config;

  try {
    // Resolve effective URL: handles relative paths, protocol-relative, baseURL, etc.
    const base = config.baseURL || window.location.origin;
    const effective = new URL(config.url || '', base);

    // Only attach token if same origin AND path is under the allowed API prefix
    const sameOrigin = effective.origin === _API_BASE.origin;
    // Agrega slash al path efectivo si no lo tiene (para comparar /api/v2 con /api/v2/)
    const pathWithSlash = effective.pathname.endsWith('/') ? effective.pathname : `${effective.pathname}/`;
    const underApiPath = pathWithSlash.startsWith(_API_PREFIX) || effective.pathname === _API_BASE.pathname;

    if (sameOrigin && underApiPath) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Malformed URL — do not attach token
  }

  return config;
});

window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
