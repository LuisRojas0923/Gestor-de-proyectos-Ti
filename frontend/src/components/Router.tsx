import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Chat from '../pages/Chat';
import Dashboard from '../pages/Dashboard';
import Indicators from '../pages/Indicators';
import MyDevelopments from '../pages/MyDevelopments';
import DevelopmentDetail from '../pages/DevelopmentDetail';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import ServicePortal from '../pages/ServicePortal';
import TicketDetail from '../pages/TicketDetail';
import TicketManagement from '../pages/TicketManagement';
import Login from '../pages/Login';
import Layout from './layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas Administrativas (Analistas) */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="developments" element={<MyDevelopments />} />
          <Route path="developments/:developmentId" element={<DevelopmentDetail />} />
          <Route path="indicators" element={<Indicators />} />
          <Route path="chat" element={<Chat />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="ticket-management" element={<TicketManagement />} />
        </Route>

        {/* Rutas del Portal (Usuarios Finales) */}
        <Route path="/service-portal" element={
          <ProtectedRoute allowedRoles={['user', 'analyst']}>
            <ServicePortal />
          </ProtectedRoute>
        } />
        <Route path="/tickets/:ticketId" element={
          <ProtectedRoute allowedRoles={['user', 'analyst']}>
            <TicketDetail />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;