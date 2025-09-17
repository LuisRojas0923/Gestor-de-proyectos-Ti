import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import AppRouter from './components/Router';
import { AppProvider } from './context/AppContext';
import './i18n';

function App() {
  useEffect(() => {
    // Initialize app - user data will come from authentication
    // dispatch({ type: 'SET_USER', payload: userFromAuth });
  }, []);

  return (
    <AppProvider>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </AppProvider>
  );
}

export default App;
