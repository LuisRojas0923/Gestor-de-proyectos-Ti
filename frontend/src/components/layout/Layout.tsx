import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';
import { UpdateEmailBanner } from './UpdateEmailBanner';
import { ForcePasswordResetModal } from '../auth/ForcePasswordResetModal';

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

    // Marcar que venimos del panel administrativo para navegación contextual
    sessionStorage.setItem('fromAdmin', 'true');

    // Intervalo de 1.5 minutos
    const interval = setInterval(sendHeartbeat, 90000);
    return () => clearInterval(interval);
  }, [user, post]);

  return (
    <div className="h-screen flex bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <UpdateEmailBanner />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <ForcePasswordResetModal />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
