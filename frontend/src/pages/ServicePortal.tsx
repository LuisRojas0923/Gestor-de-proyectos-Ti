import React from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useNotifications } from '../components/notifications/NotificationsContext';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import DashboardView from './ServicePortal/pages/DashboardView';
import TicketListView from './ServicePortal/pages/TicketListView';
import SuccessView from './ServicePortal/pages/SuccessView';
import ExpenseLegalization from './ServicePortal/pages/ExpenseLegalization';
import AreaSelectionView from './ServicePortal/pages/AreaSelectionView';
import ViaticosManagement from './ServicePortal/pages/ViaticosManagement';
import AccountStatement from './ServicePortal/pages/AccountStatement';
import DirectorExpensePanel from './ServicePortal/pages/DirectorExpensePanel';
import TransitReportsView from './ServicePortal/pages/TransitReportsView';
import ReservaSalasView from './ServicePortal/pages/ReservaSalasView';
import RequestPortalView from './ServicePortal/pages/Requests/RequestPortalView';
import AlmacenSubAreaView from './ServicePortal/pages/Requests/AlmacenSubAreaView';
import AlmacenFormView from './ServicePortal/pages/Requests/AlmacenFormView';
import MisRequisicionesView from './ServicePortal/pages/Requests/MisRequisicionesView';
import InventarioView from './ServicePortal/pages/Inventario';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PortalLayout from './ServicePortal/PortalLayout';
import NominaDashboard from './ServicePortal/pages/NOVEDADES_NOMINA/NominaDashboard';
import NominaUploadView from './ServicePortal/pages/NOVEDADES_NOMINA/NominaUploadView';
import NominaPreviewView from './ServicePortal/pages/NOVEDADES_NOMINA/NominaPreviewView';
import NominaSummaryView from './ServicePortal/pages/NOVEDADES_NOMINA/NominaSummaryView';
import NominaHistorialView from './ServicePortal/pages/NOVEDADES_NOMINA/NominaHistorialView';
import GrancoopPreview from './ServicePortal/pages/NOVEDADES_NOMINA/GrancoopPreview';
import BeneficiarPreview from './ServicePortal/pages/NOVEDADES_NOMINA/BeneficiarPreview';
import HdiPreview from './ServicePortal/pages/NOVEDADES_NOMINA/HdiPreview';
import BogotaLibranzaPreview from './ServicePortal/pages/NOVEDADES_NOMINA/BogotaLibranzaPreview';
import DaviviendaLibranzaPreview from './ServicePortal/pages/NOVEDADES_NOMINA/DaviviendaLibranzaPreview';
import OccidenteLibranzaPreview from './ServicePortal/pages/NOVEDADES_NOMINA/OccidenteLibranzaPreview';
import CamposantoPreview from './ServicePortal/pages/NOVEDADES_NOMINA/CamposantoPreview';
import RecordarPreview from './ServicePortal/pages/NOVEDADES_NOMINA/RecordarPreview';
import PolizasVehiculosPreview from './ServicePortal/pages/NOVEDADES_NOMINA/PolizasVehiculosPreview';
import MedicinaPrepagadaPreview from './ServicePortal/pages/NOVEDADES_NOMINA/MedicinaPrepagadaPreview';
import OtrosGerenciaPreview from './ServicePortal/pages/NOVEDADES_NOMINA/OtrosGerenciaPreview';
import ControlDescuentosPreview from './ServicePortal/pages/NOVEDADES_NOMINA/ControlDescuentosPreview';
import CelularesPreview from './ServicePortal/pages/NOVEDADES_NOMINA/CelularesPreview';
import EmbargosPreview from './ServicePortal/pages/NOVEDADES_NOMINA/EmbargosPreview';

import {
    CategoryWrapper,
    TicketFormWrapper,
    TicketDetailWrapper
} from './ServicePortal/PortalWrappers';
import { useServicePortal } from './ServicePortal/hooks/useServicePortal';

const API_BASE_URL = API_CONFIG.BASE_URL;

const ServicePortal: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const {
        user,
        dispatch,
        categories,
        selectedCategory,
        setSelectedCategory,
        selectedTicket,
        setSelectedTicket,
        tickets,
        moduleStatus,
        isLoading,
        setIsLoading,
        newTicketId,
        selectedFiles,
        setSelectedFiles,
        handleSubmit,
        handleSendUserFeedback
    } = useServicePortal();

    if (!user) return <div className="flex justify-center items-center h-screen">Cargando perfil...</div>;

    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        const ticketId = await handleSubmit(e);
        if (ticketId) {
            navigate(`/service-portal/exito/${ticketId}`);
        }
    };

    const onFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        const success = await handleSendUserFeedback(e);
        if (success) navigate('/service-portal/mis-tickets');
    };

    const onSelectReport = async (reporte: any) => {
        const rid = reporte.reporte_id;
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE_URL}/viaticos/reporte/${rid}/detalle`);
            const resData = res.data as any[];
            const lineasDetalle = resData.map((l: any) => ({
                id: l.id || Math.random().toString(36).substring(7),
                categoria: l.categoria,
                fecha: l.fecharealgasto || l.fecha_gasto || l.fecha,
                ot: l.ot,
                cc: l.centrocosto || l.cc,
                scc: l.subcentrocosto || l.scc,
                valorConFactura: Number(l.valorconfactura !== undefined ? l.valorconfactura : l.valor_con_factura),
                valorSinFactura: Number(l.valorsinfactura !== undefined ? l.valorsinfactura : l.valor_sin_factura),
                observaciones: l.observaciones || l.observaciones_linea,
                adjuntos: typeof l.adjuntos === 'string' ? JSON.parse(l.adjuntos) : (l.adjuntos || []),
                combinacionesCC: []
            }));

            navigate('/service-portal/gastos/nuevo', {
                state: {
                    ...reporte,
                    lineas: lineasDetalle,
                    observaciones: resData[0]?.observaciones_gral,
                    reporte_id: rid,
                    estado: reporte.estado,
                    readonly: reporte.readonly || false,
                    from: reporte.readonly ? 'director' : 'reportes'
                }
            });
        } catch (err) {
            console.error("Error cargando detalle:", err);
            addNotification('error', "No se pudo cargar el detalle del reporte.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PortalLayout
            user={user}
            onHome={() => navigate('/service-portal/inicio')}
            onLogout={async () => {
                try {
                    await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                } catch (err) {
                    console.warn("Error notificando logout en portal:", err);
                } finally {
                    dispatch({ type: 'LOGOUT' });
                    navigate('/login');
                }
            }}
        >
            <Routes>
                <Route index element={<Navigate to="/service-portal/inicio" replace />} />

                <Route path="inicio" element={
                    <DashboardView
                        user={user}
                        moduleStatus={moduleStatus}
                        onNavigate={async (v) => {
                            if (v === 'viaticos_gestion') navigate('/service-portal/gastos/gestion');
                            else if (v === 'categories') navigate('/service-portal/servicios');
                            else if (v === 'status') navigate('/service-portal/mis-tickets');
                            else if (v === 'reserva_salas') navigate('/service-portal/reserva-salas');
                            else if (v === 'nomina') navigate('/service-portal/novedades-nomina');
                            else if (v === 'requisiciones') navigate('/service-portal/requisiciones');
                            else if (v === 'inventario') navigate('/service-portal/inventario');
                        }}
                    />
                } />

                {/* --- NUEVAS RUTAS DE REQUISICIONES / ALMACEN ERP --- */}
                <Route path="requisiciones" element={
                    <ProtectedRoute moduleCode="requisiciones">
                        <RequestPortalView
                            user={user}
                            onSelectArea={(area) => navigate(`/service-portal/requisiciones/${area}`)}
                            onConsultStatus={() => navigate('/service-portal/requisiciones/mis-solicitudes')}
                            onBack={() => navigate('/service-portal/inicio')}
                        />
                    </ProtectedRoute>
                } />

                <Route path="requisiciones/almacen" element={
                    <ProtectedRoute moduleCode="requisiciones">
                        <AlmacenSubAreaView />
                    </ProtectedRoute>
                } />

                <Route path="requisiciones/almacen/crear/:especialidad" element={
                    <ProtectedRoute moduleCode="requisiciones">
                        <AlmacenFormView user={user} />
                    </ProtectedRoute>
                } />

                <Route path="requisiciones/mis-solicitudes" element={
                    <ProtectedRoute moduleCode="requisiciones">
                        <MisRequisicionesView />
                    </ProtectedRoute>
                } />

                {/* --- RUTAS EXISTENTES DE SOPORTE TI --- */}
                <Route path="servicios" element={
                    <ProtectedRoute moduleCode="mis_solicitudes">
                        <AreaSelectionView
                            user={user}
                            onSelectArea={(area) => navigate(`/service-portal/servicios/${area}`)}
                            onConsultStatus={() => navigate('/service-portal/mis-tickets')}
                            onBack={() => navigate('/service-portal/inicio')}
                        />
                    </ProtectedRoute>
                } />

                <Route path="servicios/:area" element={
                    <ProtectedRoute moduleCode="mis_solicitudes">
                        <CategoryWrapper
                            categories={categories}
                            onSelect={(c) => { setSelectedCategory(c); navigate(`/service-portal/crear/${c.id}`); }}
                            onBack={() => navigate('/service-portal/servicios')}
                        />
                    </ProtectedRoute>
                } />

                <Route path="crear/:categoryId" element={
                    <ProtectedRoute moduleCode="mis_solicitudes">
                        <TicketFormWrapper
                            selectedCategory={selectedCategory}
                            categories={categories}
                            user={user}
                            onSubmit={onFormSubmit}
                            onBack={() => { navigate(-1); setSelectedFiles([]); }}
                            isLoading={isLoading}
                            selectedFiles={selectedFiles}
                            onFilesChange={setSelectedFiles}
                        />
                    </ProtectedRoute>
                } />

                <Route path="mis-tickets" element={
                    <ProtectedRoute moduleCode="mis_solicitudes">
                        <TicketListView
                            tickets={tickets}
                            onBack={() => navigate('/service-portal/servicios')}
                            onViewDetail={(t) => { setSelectedTicket(t); navigate(`/service-portal/mis-tickets/${t.id}`); }}
                        />
                    </ProtectedRoute>
                } />

                <Route path="mis-tickets/:ticketId" element={
                    <ProtectedRoute moduleCode="mis_solicitudes">
                        <TicketDetailWrapper
                            selectedTicket={selectedTicket}
                            tickets={tickets}
                            user={user}
                            onBack={() => navigate('/service-portal/mis-tickets')}
                            onUpdate={onFeedbackSubmit}
                        />
                    </ProtectedRoute>
                } />

                <Route path="gastos/gestion" element={
                    <ProtectedRoute moduleCode="viaticos_gestion">
                        <ViaticosManagement
                            moduleStatus={moduleStatus}
                            onNavigate={(v) => {
                                if (v === 'legalizar_gastos') navigate('/service-portal/gastos/nuevo');
                                else if (v === 'viaticos_reportes') navigate('/service-portal/gastos/reportes');
                                else if (v === 'viaticos_estado') navigate('/service-portal/gastos/estado');
                                else if (v === 'director_legalizaciones') navigate('/service-portal/gastos/director');
                            }}
                            onBack={() => navigate('/service-portal/inicio')}
                        />
                    </ProtectedRoute>
                } />

                <Route path="gastos/nuevo" element={
                    <ProtectedRoute moduleCode="viaticos_reportes">
                        <ExpenseLegalization
                            user={user}
                            onBack={() => navigate(-1)}
                            onSuccess={() => {
                                navigate('/service-portal/gastos/reportes');
                                addNotification('success', 'Operación realizada correctamente.');
                            }}
                        />
                    </ProtectedRoute>
                } />

                <Route path="gastos/reportes" element={
                    <ProtectedRoute moduleCode="viaticos_reportes">
                        <TransitReportsView
                            user={user}
                            onBack={() => navigate('/service-portal/gastos/gestion')}
                            onNewReport={() => navigate('/service-portal/gastos/nuevo', { state: { newReport: true } })}
                            onSelectReport={onSelectReport}
                        />
                    </ProtectedRoute>
                } />

                <Route path="gastos/director" element={
                    <ProtectedRoute moduleCode="viaticos_director_panel">
                        <DirectorExpensePanel 
                            onBack={() => navigate('/service-portal/gastos/gestion')}
                            onSelectReport={(rep) => onSelectReport({ ...rep, readonly: true })}
                        />
                    </ProtectedRoute>
                } />

                <Route path="gastos/estado" element={
                    <ProtectedRoute moduleCode="viaticos_estado">
                        <AccountStatement user={user as any} onBack={() => navigate('/service-portal/gastos/gestion')} />
                    </ProtectedRoute>
                } />

                <Route path="exito/:ticketId" element={
                    <SuccessView newTicketId={newTicketId} onHome={() => navigate('/service-portal/inicio')} />
                } />

                <Route path="reserva-salas" element={
                    <ProtectedRoute moduleCode="reserva_salas">
                        <ReservaSalasView onBack={() => navigate('/service-portal/inicio')} />
                    </ProtectedRoute>
                } />

                <Route path="novedades-nomina" element={<NominaDashboard />} />
                <Route path="novedades-nomina/LIBRANZAS/BOGOTA LIBRANZA" element={<BogotaLibranzaPreview />} />
                <Route path="novedades-nomina/LIBRANZAS/DAVIVIENDA LIBRANZA" element={<DaviviendaLibranzaPreview />} />
                <Route path="novedades-nomina/LIBRANZAS/OCCIDENTE LIBRANZA" element={<OccidenteLibranzaPreview />} />
                <Route path="novedades-nomina/COOPERATIVAS/GRANCOOP" element={<GrancoopPreview />} />
                <Route path="novedades-nomina/COOPERATIVAS/BENEFICIAR" element={<BeneficiarPreview />} />
                <Route path="novedades-nomina/OTROS/SEGUROS HDI" element={<HdiPreview />} />
                <Route path="novedades-nomina/FUNEBRES/CAMPOSANTO" element={<CamposantoPreview />} />
                <Route path="novedades-nomina/FUNEBRES/RECORDAR" element={<RecordarPreview />} />
                <Route path="novedades-nomina/OTROS/POLIZAS VEHICULOS" element={<PolizasVehiculosPreview />} />
                <Route path="novedades-nomina/OTROS/MEDICINA PREPAGADA" element={<MedicinaPrepagadaPreview />} />
                <Route path="novedades-nomina/OTROS/OTROS GERENCIA" element={<OtrosGerenciaPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS" element={<ControlDescuentosPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/CELULARES" element={<CelularesPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/EMBARGOS" element={<EmbargosPreview />} />
                <Route path="novedades-nomina/:category/:subcategory" element={<NominaUploadView />} />
                <Route path="novedades-nomina/preview/:archivoId" element={<NominaPreviewView />} />
                <Route path="novedades-nomina/resumen" element={<NominaSummaryView />} />
                <Route path="novedades-nomina/historial" element={<NominaHistorialView />} />
                <Route path="inventario" element={
                    <ProtectedRoute moduleCode="inventario_2026">
                        <InventarioView onBack={() => navigate('/service-portal/inicio')} />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/service-portal/inicio" replace />} />
            </Routes>
        </PortalLayout>
    );
};

export default ServicePortal;
