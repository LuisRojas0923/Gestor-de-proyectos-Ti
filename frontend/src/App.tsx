import { useEffect } from 'react';
import AppRouter from './components/Router';
import { AppProvider } from './context/AppContext';
import { NotificationsProvider } from './components/notifications/NotificationsContext';
import { NotificationsContainer } from './components/notifications/NotificationsContainer';
import './i18n';

function App() {
  useEffect(() => {
    // Initialize app - user data will come from authentication
    // dispatch({ type: 'SET_USER', payload: userFromAuth });
  }, []);

  return (
    <AppProvider>
      <NotificationsProvider>
        <AppRouter />
        <NotificationsContainer />
      </NotificationsProvider>
    </AppProvider>
  );
}

export default App;
