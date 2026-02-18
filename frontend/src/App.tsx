import { useEffect } from 'react';
import AppRouter from './components/Router';
import { AppProvider } from './context/AppContext';
import { NotificationsProvider } from './components/notifications/NotificationsContext';
import { NotificationsContainer } from './components/notifications/NotificationsContainer';
import './i18n';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  useEffect(() => {
    // Inicializar tema desde localStorage o preferencia del sistema
    const savedTheme = localStorage.getItem('theme');
    const root = window.document.documentElement;
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <NotificationsProvider>
          <AppRouter />
          <NotificationsContainer />
        </NotificationsProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
