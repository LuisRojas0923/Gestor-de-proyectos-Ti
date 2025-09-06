import React, { useEffect } from 'react';
import './i18n';
import AppRouter from './components/Router';
import { AppProvider } from './context/AppContext';

function App() {
  useEffect(() => {
    // Set initial user data
    const mockUser = {
      id: '1',
      name: 'Ana García Rodríguez',
      email: 'ana.garcia@empresa.com',
      role: 'Analista Senior',
      avatar: '',
    };

    // This would normally come from authentication
    // dispatch({ type: 'SET_USER', payload: mockUser });
  }, []);

  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
