import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import axios from 'axios';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    const url = config.url || '';
    const isLocal = url.startsWith('/') || url.startsWith('http://localhost');
    const isApiBase = import.meta.env.VITE_API_BASE_URL && url.startsWith(import.meta.env.VITE_API_BASE_URL);
    if (isLocal || isApiBase) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
