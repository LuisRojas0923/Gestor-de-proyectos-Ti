import React from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
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
import ContabilidadPortal from './ServicePortal/pages/Contabilidad';
import Formato2276DataTable from './ServicePortal/pages/Contabilidad/Formato2276DataTable';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PortalLayout from './ServicePortal/PortalLayout';

import {
    CategoryWrapper,
    TicketFormWrapper,
    TicketDetailWrapper
} from './ServicePortal/PortalWrappers';
import { useServicePortal } from './ServicePortal/hooks/useServicePortal';

const API_BASE_URL = API_CONFIG.BASE_URL;

const ServicePortal: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
                            else if (v === 'requisiciones') navigate('/service-portal/requisiciones');
                            else if (v === 'inventario') navigate('/service-portal/inventario');
                            else if (v === 'contabilidad') navigate('/service-portal/contabilidad');
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
                                onBack={() => {
                                    if (location.state?.from) {
                                        navigate(location.state.from);
                                    } else {
                                        navigate('/service-portal/servicios');
                                    }
                                }}
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
                                onBack={() => {
                                    if (location.state?.from && !location.pathname.includes('/crear/')) {
                                        // Si venimos de un origen externo y estamos en el primer nivel del form, volver al origen
                                        navigate(location.state.from);
                                    } else {
                                        navigate(-1);
                                    }
                                    setSelectedFiles([]);
                                }}
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

                <Route path="inventario" element={
                    <ProtectedRoute moduleCode="inventario_2026">
                        <InventarioView onBack={() => navigate('/service-portal/inicio')} />
                    </ProtectedRoute>
                } />

                <Route path="contabilidad" element={
                    <ProtectedRoute moduleCode="contabilidad">
                        <ContabilidadPortal user={user} onBack={() => navigate('/service-portal/inicio')} />
                    </ProtectedRoute>
                } />

                <Route path="contabilidad/datos" element={
                    <ProtectedRoute moduleCode="contabilidad">
                        <Formato2276DataTable onBack={() => navigate('/service-portal/contabilidad')} />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/service-portal/inicio" replace />} />
            </Routes>
        </PortalLayout>
    );
};

export default ServicePortal;
