import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import axios from 'axios';

const _API_ALLOWED_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL || window.location.origin);
  } catch {
    return new URL(window.location.origin);
  }
})();

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (!token || !config.headers) return config;

  try {
    // Resolve effective URL: handles relative paths, protocol-relative, baseURL, etc.
    const base = config.baseURL || window.location.origin;
    const effective = new URL(config.url || '', base);

    // Only attach token if same origin AND path is under the allowed API prefix
    const sameOrigin = effective.origin === _API_ALLOWED_ORIGIN.origin;
    const underApiPath = effective.pathname.startsWith(_API_ALLOWED_ORIGIN.pathname);

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
