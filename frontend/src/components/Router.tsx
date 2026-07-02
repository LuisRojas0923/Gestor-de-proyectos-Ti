import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute';
import RouteLoadingFallback from './common/RouteLoadingFallback';

const Chat = React.lazy(() => import('../pages/Chat'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Indicators = React.lazy(() => import('../pages/Indicators'));
const MyDevelopments = React.lazy(() => import('../pages/MyDevelopments'));
const DevelopmentDetail = React.lazy(() => import('../pages/DevelopmentDetail'));
const Reports = React.lazy(() => import('../pages/Reports'));
const Settings = React.lazy(() => import('../pages/Settings'));
const ServicePortal = React.lazy(() => import('../pages/ServicePortal'));
const OrganizationalHierarchy = React.lazy(() => import('../pages/OrganizationalHierarchy'));
const TicketDetail = React.lazy(() => import('../pages/TicketDetail'));
const TicketManagement = React.lazy(() => import('../pages/TicketManagement'));
const DesignSystemCatalog = React.lazy(() => import('../pages/DesignSystemCatalog'));
const Login = React.lazy(() => import('../pages/Login'));
const UserAdmin = React.lazy(() => import('../pages/UserAdmin'));
const RoomsPage = React.lazy(() => import('../pages/RoomsPage'));
const ControlTower = React.lazy(() => import('../pages/ControlTower'));
const WbsTemplatesAdmin = React.lazy(() => import('../pages/WbsTemplatesAdmin/WbsTemplatesAdmin'));
const InventarioAdmin = React.lazy(() => import('../pages/InventarioAdmin/InventarioAdmin'));
const AuditoriaSistemaPage = React.lazy(() => import('../pages/AuditoriaSistema'));
const CorporateLinesManager = React.lazy(() =>
  import('../pages/CorporateLines/CorporateLinesManager').then((module) => ({ default: module.CorporateLinesManager })),
);
const VerifyEmailPage = React.lazy(() => import('../pages/VerifyEmail/VerifyEmailPage'));
const ResetPasswordPage = React.lazy(() => import('../pages/ResetPassword/ResetPasswordPage'));

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Rutas Administrativas (Analistas y Managers) */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['analyst', 'admin', 'director', 'admin_sistemas', 'admin_mejoramiento']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ProtectedRoute moduleCode="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="developments" element={<ProtectedRoute moduleCode="developments"><MyDevelopments /></ProtectedRoute>} />
          <Route path="developments/:developmentId" element={<ProtectedRoute moduleCode="developments"><DevelopmentDetail /></ProtectedRoute>} />
          <Route path="indicators" element={<ProtectedRoute moduleCode="indicators"><Indicators /></ProtectedRoute>} />
          <Route path="chat" element={<ProtectedRoute moduleCode="chat"><Chat /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute moduleCode="reports"><Reports /></ProtectedRoute>} />

          <Route path="jerarquia-organizacional" element={<ProtectedRoute moduleCode="jerarquia_organizacional"><OrganizationalHierarchy /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute moduleCode="settings"><Settings /></ProtectedRoute>} />
          <Route path="ticket-management" element={<ProtectedRoute moduleCode="ticket-management"><TicketManagement /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute moduleCode="user-admin"><UserAdmin /></ProtectedRoute>} />
          <Route path="admin/rooms" element={<ProtectedRoute allowedRoles={['admin']}><RoomsPage /></ProtectedRoute>} />
          <Route path="admin/control-tower" element={<ProtectedRoute moduleCode="control-tower"><ControlTower /></ProtectedRoute>} />
          <Route path="admin/wbs-templates" element={<ProtectedRoute allowedRoles={['admin']}><WbsTemplatesAdmin /></ProtectedRoute>} />
          <Route path="admin/inventario" element={<ProtectedRoute moduleCode="inventario_anual"><InventarioAdmin /></ProtectedRoute>} />
          <Route path="admin/auditoria" element={<ProtectedRoute moduleCode="auditoria_sistema"><AuditoriaSistemaPage /></ProtectedRoute>} />
          <Route path="design-catalog" element={<ProtectedRoute moduleCode="design-catalog"><DesignSystemCatalog /></ProtectedRoute>} />
          <Route path="lineas-corporativas" element={<ProtectedRoute moduleCode="lineas_corporativas"><CorporateLinesManager /></ProtectedRoute>} />
        </Route>

        {/* Rutas del Portal (Usuarios Finales) */}
        <Route path="/service-portal/*" element={
          <ProtectedRoute>
            <ServicePortal />
          </ProtectedRoute>
        } />
        <Route path="/tickets/:ticketId" element={
          <ProtectedRoute>
            <TicketDetail />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
