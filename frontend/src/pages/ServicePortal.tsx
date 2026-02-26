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
        isLoading,
        setIsLoading,
        newTicketId,
        selectedFiles,
        setSelectedFiles,
        handleSubmit,
        handleSendUserFeedback,
        fetchTickets
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
                    lineas: lineasDetalle,
                    observaciones: resData[0]?.observaciones_gral,
                    reporte_id: rid,
                    estado: reporte.estado,
                    from: 'reportes'
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
                        onNavigate={async (v) => {
                            if (v === 'viaticos_gestion') navigate('/service-portal/gastos/gestion');
                            else if (v === 'categories') navigate('/service-portal/servicios');
                            else if (v === 'status') navigate('/service-portal/mis-tickets');
                            else if (v === 'reserva_salas') navigate('/service-portal/reserva-salas');
                        }}
                    />
                } />

                <Route path="servicios" element={
                    <AreaSelectionView
                        onSelectArea={(area) => navigate(`/service-portal/servicios/${area}`)}
                        onConsultStatus={() => navigate('/service-portal/mis-tickets')}
                        onBack={() => navigate('/service-portal/inicio')}
                    />
                } />

                <Route path="servicios/:area" element={
                    <CategoryWrapper
                        categories={categories}
                        onSelect={(c) => { setSelectedCategory(c); navigate(`/service-portal/crear/${c.id}`); }}
                        onBack={() => navigate('/service-portal/servicios')}
                    />
                } />

                <Route path="crear/:categoryId" element={
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
                } />

                <Route path="mis-tickets" element={
                    <TicketListView
                        tickets={tickets}
                        onBack={() => navigate('/service-portal/servicios')}
                        onViewDetail={(t) => { setSelectedTicket(t); navigate(`/service-portal/mis-tickets/${t.id}`); }}
                    />
                } />

                <Route path="mis-tickets/:ticketId" element={
                    <TicketDetailWrapper
                        selectedTicket={selectedTicket}
                        tickets={tickets}
                        user={user}
                        onBack={() => navigate('/service-portal/mis-tickets')}
                        onUpdate={onFeedbackSubmit}
                    />
                } />

                <Route path="gastos/gestion" element={
                    <ViaticosManagement
                        onNavigate={(v) => {
                            if (v === 'legalizar_gastos') navigate('/service-portal/gastos/nuevo');
                            else if (v === 'viaticos_reportes') navigate('/service-portal/gastos/reportes');
                            else if (v === 'viaticos_estado') navigate('/service-portal/gastos/estado');
                            else if (v === 'director_legalizaciones') navigate('/service-portal/gastos/director');
                        }}
                        onBack={() => navigate('/service-portal/inicio')}
                    />
                } />

                <Route path="gastos/nuevo" element={
                    <ExpenseLegalization
                        user={user}
                        onBack={() => navigate('/service-portal/gastos/reportes')}
                        onSuccess={() => {
                            navigate('/service-portal/gastos/reportes');
                            addNotification('success', 'Operación realizada correctamente.');
                        }}
                    />
                } />

                <Route path="gastos/reportes" element={
                    <TransitReportsView
                        user={user}
                        onBack={() => navigate('/service-portal/gastos/gestion')}
                        onNewReport={() => navigate('/service-portal/gastos/nuevo', { state: { newReport: true } })}
                        onSelectReport={onSelectReport}
                    />
                } />

                <Route path="gastos/director" element={
                    <DirectorExpensePanel onBack={() => navigate('/service-portal/gastos/gestion')} />
                } />

                <Route path="gastos/estado" element={
                    <AccountStatement user={user as any} onBack={() => navigate('/service-portal/gastos/gestion')} />
                } />

                <Route path="exito/:ticketId" element={
                    <SuccessView newTicketId={newTicketId} onHome={() => navigate('/service-portal/inicio')} />
                } />

                <Route path="reserva-salas" element={
                    <ReservaSalasView onBack={() => navigate('/service-portal/inicio')} />
                } />

                <Route path="*" element={<Navigate to="/service-portal/inicio" replace />} />
            </Routes>
        </PortalLayout>
    );
};

export default ServicePortal;
