import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppContext } from '../../context/AppContext';

const Layout: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`h-screen flex ${darkMode ? 'dark bg-neutral-900' : 'bg-neutral-50'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          className: darkMode ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900',
          duration: 4000,
        }}
      />
    </div>
  );
};

export default Layout;