import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';

const Layout: React.FC = () => {
  const { post } = useApi();
  const { state } = useAppContext();
  const { user } = state;

  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await post(`/panel-control/torre-control/heartbeat?token_sesion=${token}`, {});
        }
      } catch (err) {
        console.warn("Heartbeat failed", err);
      }
    };

    // Latido inicial
    sendHeartbeat();

    // Intervalo de 1 minuto
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [user, post]);

  return (
    <div className="h-screen flex bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;