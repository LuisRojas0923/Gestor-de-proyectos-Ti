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
import DesignSystemCatalog from '../pages/DesignSystemCatalog';
import Login from '../pages/Login';
import UserAdmin from '../pages/UserAdmin';
import RoomsPage from '../pages/RoomsPage';
import ControlTower from '../pages/ControlTower';
import Layout from './layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas Administrativas (Analistas y Managers) */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['analyst', 'admin', 'director', 'manager', 'admin_sistemas']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ProtectedRoute moduleCode="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="developments" element={<ProtectedRoute moduleCode="developments"><MyDevelopments /></ProtectedRoute>} />
          <Route path="developments/:developmentId" element={<ProtectedRoute moduleCode="developments"><DevelopmentDetail /></ProtectedRoute>} />
          <Route path="indicators" element={<ProtectedRoute moduleCode="indicators"><Indicators /></ProtectedRoute>} />
          <Route path="chat" element={<ProtectedRoute moduleCode="chat"><Chat /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute moduleCode="reports"><Reports /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute moduleCode="settings"><Settings /></ProtectedRoute>} />
          <Route path="ticket-management" element={<ProtectedRoute moduleCode="ticket-management"><TicketManagement /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute moduleCode="user-admin"><UserAdmin /></ProtectedRoute>} />
          <Route path="admin/rooms" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RoomsPage /></ProtectedRoute>} />
          <Route path="admin/control-tower" element={<ProtectedRoute moduleCode="control-tower"><ControlTower /></ProtectedRoute>} />
          <Route path="design-catalog" element={<ProtectedRoute moduleCode="design-catalog"><DesignSystemCatalog /></ProtectedRoute>} />
        </Route>

        {/* Rutas del Portal (Usuarios Finales) */}
        <Route path="/service-portal/*" element={
          <ProtectedRoute moduleCode="service-portal">
            <ServicePortal />
          </ProtectedRoute>
        } />
        <Route path="/tickets/:ticketId" element={
          <ProtectedRoute moduleCode="service-portal">
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