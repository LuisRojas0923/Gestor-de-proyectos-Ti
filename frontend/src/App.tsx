import { useEffect } from 'react';
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
    </AppProvider>
  );
}

export default App;
