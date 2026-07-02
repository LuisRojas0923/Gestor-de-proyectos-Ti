import React from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useNotifications } from '../components/notifications/NotificationsContext';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import DashboardView from './ServicePortal/pages/DashboardView';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RouteLoadingFallback from '../components/common/RouteLoadingFallback';
import PortalLayout from './ServicePortal/PortalLayout';
import EmailUpdateModal from './ServicePortal/components/EmailUpdateModal';
import VerificationBanner from './ServicePortal/components/VerificationBanner';
import { useServicePortal } from './ServicePortal/hooks/useServicePortal';

const API_BASE_URL = API_CONFIG.BASE_URL;

const TicketListView = React.lazy(() => import('./ServicePortal/pages/TicketListView'));
const SuccessView = React.lazy(() => import('./ServicePortal/pages/SuccessView'));
const ExpenseLegalization = React.lazy(() => import('./ServicePortal/pages/ExpenseLegalization'));
const AreaSelectionView = React.lazy(() => import('./ServicePortal/pages/AreaSelectionView'));
const ViaticosManagement = React.lazy(() => import('./ServicePortal/pages/ViaticosManagement'));
const AccountStatement = React.lazy(() => import('./ServicePortal/pages/AccountStatement'));
const DirectorExpensePanel = React.lazy(() => import('./ServicePortal/pages/DirectorExpensePanel'));
const TransitReportsView = React.lazy(() => import('./ServicePortal/pages/TransitReportsView'));
const ReservaSalasView = React.lazy(() => import('./ServicePortal/pages/ReservaSalasView'));
const RequestPortalView = React.lazy(() => import('./ServicePortal/pages/Requests/RequestPortalView'));
const AlmacenSubAreaView = React.lazy(() => import('./ServicePortal/pages/Requests/AlmacenSubAreaView'));
const AlmacenFormView = React.lazy(() => import('./ServicePortal/pages/Requests/AlmacenFormView'));
const MisRequisicionesView = React.lazy(() => import('./ServicePortal/pages/Requests/MisRequisicionesView'));
const InventarioView = React.lazy(() => import('./ServicePortal/pages/Inventario'));
const GestionHumanaPortal = React.lazy(() => import('./ServicePortal/pages/GestionHumana'));
const Formato2276DataTable = React.lazy(() => import('./ServicePortal/pages/GestionHumana/Formato2276DataTable'));
const GestionActividadesView = React.lazy(() => import('./ServicePortal/pages/GestionActividadesView'));
const MyDevelopments = React.lazy(() => import('./MyDevelopments'));
const DevelopmentDetail = React.lazy(() => import('./DevelopmentDetail'));
const OrganizationalHierarchy = React.lazy(() => import('./OrganizationalHierarchy'));
const NominaDashboard = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/NominaDashboard'));
const NominaUploadView = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/NominaUploadView'));
const NominaPreviewView = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/NominaPreviewView'));
const NominaSummaryView = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/NominaSummaryView'));
const NominaHistorialView = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/NominaHistorialView'));
const GrancoopPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/GrancoopPreview'));
const BeneficiarPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/BeneficiarPreview'));
const HdiPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/HdiPreview'));
const BogotaLibranzaPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/BogotaLibranzaPreview'));
const DaviviendaLibranzaPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/DaviviendaLibranzaPreview'));
const OccidenteLibranzaPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/OccidenteLibranzaPreview'));
const CamposantoPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/CamposantoPreview'));
const RecordarPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/RecordarPreview'));
const PolizasVehiculosPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/PolizasVehiculosPreview'));
const MedicinaPrepagadaPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/MedicinaPrepagadaPreview'));
const OtrosGerenciaPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/OtrosGerenciaPreview'));
const ControlDescuentosPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/ControlDescuentosPreview'));
const ControlDescuentosTabla = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/ControlDescuentosTabla'));
const ControlDescuentosConceptos = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/ControlDescuentosConceptos'));
const ControlDescuentosRegistro = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/ControlDescuentosRegistro'));
const CelularesPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/CelularesPreview'));
const RetencionesPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/RetencionesPreview'));
const EmbargosPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/EmbargosPreview'));
const ExcepcionesPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/ExcepcionesPreview'));
const PlanillasRegionales1QPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/PlanillasRegionales1QPreview'));
const PlanillasRegionales2QPreview = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/PlanillasRegionales2QPreview'));
const TablaMaestraView = React.lazy(() => import('./ServicePortal/pages/NOVEDADES_NOMINA/TablaMaestraView'));
const ComisionesView = React.lazy(() => import('./ServicePortal/pages/Comisiones'));
const PreLiquidacionView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView'));
const CalculoListView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/CalculoListView'));
const CalculoDetailView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/CalculoDetailView'));
const BolsaView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/BolsaView'));
const CostosOtView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/CostosOtView'));
const FestivosView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/FestivosView'));
const HorarioSemanaView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/HorarioSemanaView'));
const ConfiguracionHorasExtrasView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView'));
const NovedadesView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/NovedadesView'));
const NovedadFormView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/NovedadFormView'));
const PlanificadorSemanalView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView'));
const EmpleadosActivosView = React.lazy(() => import('./ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView'));
const CategoryWrapper = React.lazy(() =>
    import('./ServicePortal/PortalWrappers').then((module) => ({ default: module.CategoryWrapper })),
);
const TicketFormWrapper = React.lazy(() =>
    import('./ServicePortal/PortalWrappers').then((module) => ({ default: module.TicketFormWrapper })),
);
const TicketDetailWrapper = React.lazy(() =>
    import('./ServicePortal/PortalWrappers').then((module) => ({ default: module.TicketDetailWrapper })),
);

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

    const [showEmailModal, setShowEmailModal] = React.useState(false);

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

    const horasExtrasProtegida = (element: React.ReactElement) => (
        <ProtectedRoute moduleCode="nomina_horas_extras">{element}</ProtectedRoute>
    );

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
            {/* Banner de Verificación Persistent */}
            {!(user as any).emailVerified && (
                <VerificationBanner 
                    email={(user as any).email} 
                    onEdit={() => setShowEmailModal(true)}
                />
            )}
            
            <React.Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
                <Route index element={<Navigate to="/service-portal/inicio" replace />} />

                <Route path="inicio" element={
                    <DashboardView
                        user={user}
                        moduleStatus={moduleStatus}
                        onNavigate={async (v) => {
                            if (v === 'viaticos_gestion') navigate('/service-portal/gastos/gestion');
                            else if (v === 'categories') {
                                if ((user as any).email_needs_update) {
                                    setShowEmailModal(true);
                                    addNotification('info', "Por favor actualiza tu correo corporativo para continuar.");
                                } else if (!(user as any).emailVerified) {
                                    addNotification('warning', "Debes verificar tu correo corporativo antes de crear tickets. Revisa tu bandeja de entrada.");
                                } else {
                                    navigate('/service-portal/servicios');
                                }
                            }
                            else if (v === 'status') navigate('/service-portal/mis-tickets');
                            else if (v === 'reserva_salas') navigate('/service-portal/reserva-salas');
                            else if (v === 'nomina') navigate('/service-portal/novedades-nomina');
                            else if (v === 'requisiciones') navigate('/service-portal/requisiciones');
                            else if (v === 'inventario') navigate('/service-portal/inventario');
                            else if (v === 'contabilidad') navigate('/service-portal/gestion-humana');
                            else if (v === 'gestion_actividades') navigate('/service-portal/gestion-actividades');
                            else if (v === 'comisiones') navigate('/service-portal/comisiones');
                            else if (v === 'horas_extras') navigate('/service-portal/horas-extras');
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
                        <AccountStatement user={user as any} />
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
                <Route path="novedades-nomina/OTROS/GESTION EXCEPCIONES" element={<ExcepcionesPreview />} />
                <Route path="novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 1Q" element={<PlanillasRegionales1QPreview />} />
                <Route path="novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 2Q" element={<PlanillasRegionales2QPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS" element={<ControlDescuentosTabla />} />
                <Route path="novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/preview" element={<ControlDescuentosPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/tabla" element={<ControlDescuentosTabla />} />
                <Route path="novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/conceptos" element={<ControlDescuentosConceptos />} />
                <Route path="novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/registro" element={<ControlDescuentosRegistro />} />
                <Route path="novedades-nomina/DESCUENTOS/CELULARES" element={<CelularesPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/RETENCIONES" element={<RetencionesPreview />} />
                <Route path="novedades-nomina/DESCUENTOS/EMBARGOS" element={<EmbargosPreview />} />
                <Route path="novedades-nomina/:category/:subcategory" element={<NominaUploadView />} />
                <Route path="novedades-nomina/preview/:archivoId" element={<NominaPreviewView />} />
                <Route path="novedades-nomina/resumen" element={<NominaSummaryView />} />
                <Route path="novedades-nomina/tabla-maestra" element={<TablaMaestraView />} />
                <Route path="novedades-nomina/historial" element={<NominaHistorialView />} />
                
                <Route path="comisiones" element={
                    <ProtectedRoute moduleCode="comisiones">
                        <ComisionesView />
                    </ProtectedRoute>
                } />

                <Route path="horas-extras" element={horasExtrasProtegida(<PlanificadorSemanalView />)} />
                <Route path="horas-extras/pre-liquidacion" element={horasExtrasProtegida(<PreLiquidacionView />)} />
                <Route path="horas-extras/calculos" element={horasExtrasProtegida(<CalculoListView />)} />
                <Route path="horas-extras/calculos/:calculoId" element={horasExtrasProtegida(<CalculoDetailView />)} />
                <Route path="horas-extras/bolsa" element={horasExtrasProtegida(<BolsaView />)} />
                <Route path="horas-extras/empleados" element={horasExtrasProtegida(<EmpleadosActivosView />)} />
                <Route path="horas-extras/costos-ot" element={horasExtrasProtegida(<CostosOtView />)} />
                <Route path="horas-extras/festivos" element={horasExtrasProtegida(<FestivosView />)} />
                <Route path="horas-extras/configuracion" element={horasExtrasProtegida(<ConfiguracionHorasExtrasView />)} />
                <Route path="horas-extras/horario" element={horasExtrasProtegida(<HorarioSemanaView />)} />
                <Route path="horas-extras/horario/:cedula" element={horasExtrasProtegida(<HorarioSemanaView />)} />
                <Route path="horas-extras/novedades" element={horasExtrasProtegida(<NovedadesView />)} />
                <Route path="horas-extras/novedades/nueva" element={horasExtrasProtegida(<NovedadFormView />)} />
                <Route path="horas-extras/novedades/:id" element={horasExtrasProtegida(<NovedadFormView />)} />
                <Route path="horas-extras/planificador" element={horasExtrasProtegida(<PlanificadorSemanalView />)} />

                <Route path="inventario" element={
                    <ProtectedRoute moduleCode="inventario_2026">
                        <InventarioView onBack={() => navigate('/service-portal/inicio')} />
                    </ProtectedRoute>
                } />

                <Route path="gestion-humana" element={
                    <ProtectedRoute moduleCode="gestion_humana">
                        <GestionHumanaPortal user={user} onBack={() => navigate('/service-portal/inicio')} />
                    </ProtectedRoute>
                } />

                <Route path="gestion-humana/datos" element={
                    <ProtectedRoute moduleCode="gestion_humana">
                        <Formato2276DataTable onBack={() => navigate('/service-portal/gestion-humana')} />
                    </ProtectedRoute>
                } />

                <Route path="gestion-actividades" element={
                    <GestionActividadesView
                        user={user}
                        onNavigate={(v) => {
                            if (v === 'desarrollos') navigate('/service-portal/desarrollos');
                            else if (v === 'jerarquia') navigate('/service-portal/jerarquia-organizacional');
                        }}
                        onBack={() => navigate('/service-portal/inicio')}
                    />
                } />

                <Route path="desarrollos" element={
                    <ProtectedRoute moduleCode="developments">
                        <MyDevelopments />
                    </ProtectedRoute>
                } />

                <Route path="desarrollos/:developmentId" element={
                    <ProtectedRoute moduleCode="developments">
                        <DevelopmentDetail />
                    </ProtectedRoute>
                } />



                <Route path="jerarquia-organizacional" element={
                    <ProtectedRoute moduleCode="jerarquia_organizacional">
                        <OrganizationalHierarchy />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/service-portal/inicio" replace />} />
            </Routes>
            </React.Suspense>

            {/* Modal de Actualización de Correo Corporativo - Forzado para creación de tickets */}
            <EmailUpdateModal 
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onSuccess={() => {
                    setShowEmailModal(false);
                    // Una vez actualizado con éxito, lo llevamos a servicios
                    navigate('/service-portal/servicios');
                }}
            />
        </PortalLayout>
    );
};

export default ServicePortal;
