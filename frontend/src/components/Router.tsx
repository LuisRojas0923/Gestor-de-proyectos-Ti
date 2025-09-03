import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from '../pages/Dashboard';
import Requirements from '../pages/Requirements';
import Testing from '../pages/Testing';
import Chat from '../pages/Chat';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="requirements" element={<Requirements />} />
          <Route path="testing" element={<Testing />} />
          <Route path="chat" element={<Chat />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;