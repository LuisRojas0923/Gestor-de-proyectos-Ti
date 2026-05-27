// Router del módulo Requisición de Personal
// Maneja sub-rutas internas del módulo dentro del ServicePortal
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MisRequisicionesRP from './pages/MisRequisicionesRP';
import BandejaAprobadorRP from './pages/BandejaAprobadorRP';
import BandejaGestionHumana from './pages/BandejaGestionHumana';
import NuevaRequisicionWizard from './pages/NuevaRequisicion/NuevaRequisicionWizard';
import DashboardRP from './pages/DashboardRP';

interface UserData {
  id: string;
  name: string;
  email: string;
  rol?: string;
  [key: string]: any;
}

interface RequisicionPersonalRouterProps {
  user: UserData;
}

const RequisicionPersonalRouter: React.FC<RequisicionPersonalRouterProps> = ({ user }) => {
  const navigate = useNavigate();

  const goTo = (path: string) => navigate(`/service-portal/requisicion-personal/${path}`);

  return (
    <div className="space-y-4 py-4">
      <Routes>
        {/* Dashboard principal del módulo */}
        <Route index element={
          <DashboardRP
            user={user}
            onNueva={() => goTo('nueva')}
            onMisRequisiciones={() => goTo('mis-requisiciones')}
            onAprobaciones={() => goTo('aprobaciones')}
            onGestionHumana={() => goTo('gestion-humana')}
            onVolver={() => navigate('/service-portal')}
          />
        } />

        {/* Mis requisiciones (solicitante) */}
        <Route path="mis-requisiciones" element={
          <MisRequisicionesRP
            correoSolicitante={user.email}
            nombreSolicitante={user.name}
            onNueva={() => goTo('nueva')}
            onVer={(id) => goTo(`detalle/${id}`)}
            onEditar={(id) => goTo(`editar/${id}`)}
            onVolver={() => goTo('')}
          />
        } />

        {/* Nueva requisición — wizard */}
        <Route path="nueva" element={
          <NuevaRequisicionWizard
            correoSolicitante={user.email}
            nombreSolicitante={user.name}
            onSuccess={() => goTo('mis-requisiciones')}
            onBack={() => goTo('')}
          />
        } />

        {/* Editar requisición devuelta */}
        <Route path="editar/:id" element={
          <EditarRequisicion user={user} goTo={goTo} />
        } />

        {/* Bandeja aprobador */}
        <Route path="aprobaciones" element={
          <BandejaAprobadorRP
            correoAprobador={user.email}
            onVer={(id) => goTo(`detalle/${id}`)}
            onVolver={() => goTo('')}
          />
        } />

        {/* Bandeja Gestión Humana */}
        <Route path="gestion-humana" element={
          <BandejaGestionHumana
            onVer={(id) => goTo(`detalle/${id}`)}
            onVolver={() => goTo('')}
          />
        } />

        {/* Detalle */}
        <Route path="detalle/:id" element={
          <DetalleRequisicionLoader goTo={goTo} />
        } />

        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  );
};

// Sub-componente para editar con ID de URL
const EditarRequisicion: React.FC<{ user: UserData; goTo: (p: string) => void }> = ({ user, goTo }) => {
  const { id } = useParams();
  return (
    <NuevaRequisicionWizard
      correoSolicitante={user.email}
      nombreSolicitante={user.name}
      onSuccess={() => goTo('mis-requisiciones')}
      onBack={() => goTo('mis-requisiciones')}
      requisicionIdEditar={id ? Number(id) : undefined}
    />
  );
};

// Sub-componente para cargar detalle con ID de URL
const DetalleRequisicionLoader: React.FC<{ goTo: (p: string) => void }> = ({ goTo }) => {
  const { id } = useParams();
  // Import lazy para no superar límite de líneas en este archivo
  const DetalleRequisicion = React.lazy(() => import('./pages/DetalleRequisicion'));
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>}>
      <DetalleRequisicion requisicionId={Number(id)} onBack={() => goTo('mis-requisiciones')} />
    </React.Suspense>
  );
};

// Necesario para los sub-componentes
import { useParams } from 'react-router-dom';

export default RequisicionPersonalRouter;
