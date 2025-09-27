import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Chat from '../pages/Chat';
import Dashboard from '../pages/Dashboard';
import Indicators from '../pages/Indicators';
import MyDevelopments from '../pages/MyDevelopments';
import DevelopmentDetail from '../pages/DevelopmentDetail';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Layout from './layout/Layout';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="developments" element={<MyDevelopments />} />
          <Route path="developments/:developmentId" element={<DevelopmentDetail />} />
          <Route path="indicators" element={<Indicators />} />
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