import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button, Text, Title, Textarea, Badge } from '../../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useExpenseForm } from '../hooks/useExpenseForm';
import UserSummaryCard from '../components/UserSummaryCard';
import ExpenseLineItem from '../components/ExpenseLineItem';
import ExpenseMobileCard from '../components/ExpenseMobileCard';
import ExpenseTotals from '../components/ExpenseTotals';

import { ExpenseConfirmModal, ClearReportConfirmModal, DeleteReportConfirmModal } from '../../../components/molecules';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface ExpenseLegalizationProps {
    user: any;
    onBack: () => void;
    onSuccess: () => void;
    initialLineas?: any[];
    initialObservaciones?: string;
}

const ExpenseLegalization: React.FC<ExpenseLegalizationProps> = ({
    user,
    onBack,
    onSuccess,
    initialLineas,
    initialObservaciones
}) => {
    const location = useLocation();
    const state = location.state as { lineas?: any[], observaciones?: string, reporte_id?: string, from?: string } | null;

    const {
        lineas,
        setLineas,
        observacionesGral,
        setObservacionesGral,
        ots,
        isSearchingOT,
        addLinea,
        removeLinea,
        updateLinea,
        handleOTSearch,
        selectOT,
        totalFacturado,
        totalSinFactura,
        totalGeneral,
        clearForm,
        loadLineas,
        restoreBackup,
        hasBackup,
        validationErrors,
        setValidationErrors,
        logMarina
    } = useExpenseForm();

    const reporteIdOriginal = state?.reporte_id || (initialLineas?.[0] as any)?.reporte_id || (state?.lineas?.[0] as any)?.reporte_id;

    const hasLoadedInitial = React.useRef(false);

    // Cargar lineas iniciales si vienen por props o por location.state (edición de tránsito)
    React.useEffect(() => {
        if (hasLoadedInitial.current) return;

        const lineasACargar = initialLineas || state?.lineas;
        const obsACargar = initialObservaciones || state?.observaciones;

        if (lineasACargar && lineasACargar.length > 0) {
            loadLineas(lineasACargar, obsACargar);
            hasLoadedInitial.current = true;
        }
    }, [initialLineas, initialObservaciones, state, loadLineas]);

    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
    const [isDeletingReport, setIsDeletingReport] = useState(false);
    const { addNotification } = useNotifications();

    const handlePrepareSubmit = () => {
        const errors: Record<string, string[]> = {};
        let hayErrores = false;
        const mensajesErrores: string[] = [];

        if (lineas.length === 0) {
            addNotification('error', 'Debe reportar al menos un gasto.');
            return;
        }

        lineas.forEach((l, idx) => {
            const camposFaltantes: string[] = [];
            const lineErrors: string[] = [];

            if (!l.categoria) {
                lineErrors.push('categoria');
                camposFaltantes.push('Categoría');
            }
            if (!l.ot) {
                lineErrors.push('ot');
                camposFaltantes.push('OT');
            }
            if (!l.cc) {
                lineErrors.push('cc');
                camposFaltantes.push('Centro de Costo');
            }
            if (!l.scc) {
                lineErrors.push('scc');
                camposFaltantes.push('Subcentro de Costo');
            }
            if (Number(l.valorConFactura) === 0 && Number(l.valorSinFactura) === 0) {
                lineErrors.push('valorConFactura', 'valorSinFactura');
                camposFaltantes.push('Valor');
            }

            if (lineErrors.length > 0) {
                errors[l.id] = lineErrors;
                hayErrores = true;
                mensajesErrores.push(`Fila ${idx + 1}: falta ${camposFaltantes.join(', ')}`);
            }
        });

        if (hayErrores) {
            setValidationErrors(errors);
            // Mostrar los primeros 3 errores si hay muchos para no saturar
            const mensajeMostrar = mensajesErrores.slice(0, 3).join(' | ') + (mensajesErrores.length > 3 ? '...' : '');
            addNotification('error', `Campos pendientes: ${mensajeMostrar}`);
            return;
        }

        setValidationErrors({});
        setShowConfirmModal(true);
    };

    const handleSubmit = async (estado: 'BORRADOR' | 'PRE-INICIAL' = 'PRE-INICIAL') => {
        setIsLoading(true);
        setShowConfirmModal(false);
        try {
            const payload = {
                reporte_id: reporteIdOriginal || null, // Pasar ID si es edición
                empleado_cedula: user.cedula || user.id,
                empleado_nombre: user.name,
                area: user.area || 'N/A',
                cargo: user.cargo || 'N/A',
                centrocosto: user.centrocosto || 'N/A',
                ciudad: user.sede || 'N/A',
                observaciones_gral: observacionesGral,
                usuario_id: user.cedula || user.id,
                estado: estado,
                gastos: lineas.map(l => ({
                    categoria: l.categoria,
                    fecha: l.fecha || new Date().toISOString().split('T')[0], // Fecha por defecto si falta
                    ot: l.ot,
                    ot_id: l.ot_id,
                    cc: l.cc,
                    scc: l.scc,
                    valorConFactura: Number(l.valorConFactura),
                    valorSinFactura: Number(l.valorSinFactura),
                    observaciones: l.observaciones || '',
                    adjuntos: l.adjuntos || []
                }))
            };

            // DEBUG: Ver payload antes de enviar para diagnosticar 422
            console.log('⚓ Marina DEBUG | Payload a enviar:', JSON.stringify(payload, null, 2));

            const response = await axios.post(`${API_BASE_URL}/viaticos/enviar`, payload);

            logMarina(`🚀 [API] Reporte guardado como ${estado} con éxito.`);

            if (estado === 'BORRADOR') {
                addNotification('success', 'Borrador guardado correctamente en el ERP.');
                // Si es un borrador nuevo, necesitamos actualizar la URL o el estado local con el ID retornado
                if (!reporteIdOriginal && response.data.reporte_id) {
                    // Aquí podríamos recargar la página con el ID o simplemente notificar
                    // Por ahora, al ser borrador persistido en DB, si el usuario sale y vuelve, lo verá en "Mis Legalizaciones"
                }
            } else {
                clearForm();
                onSuccess();
            }
        } catch (err: any) {
            console.error(`Error guardando como ${estado}:`, err);
            // Robustecer manejo de errores: FastAPI devuelve objetos de validación, no strings
            let errorMessage = 'Error al procesar el reporte.';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                } else if (Array.isArray(err.response.data.detail)) {
                    // Pydantic devuelve array de errores de validación
                    errorMessage = err.response.data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
                } else {
                    errorMessage = JSON.stringify(err.response.data.detail);
                }
            }
            addNotification('error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteReport = async () => {
        if (!reporteIdOriginal) return;
        setIsDeletingReport(true);
        try {
            await axios.delete(`${API_BASE_URL}/viaticos/reporte/${reporteIdOriginal}`);
            addNotification('success', 'Reporte eliminado permanentemente.');
            onBack();
        } catch (err) {
            console.error("Error deleting report:", err);
            addNotification('error', 'No se pudo eliminar el reporte.');
        } finally {
            setIsDeletingReport(false);
            setShowDeleteReportModal(false);
        }
    };

    const handleSaveDraft = () => {
        if (lineas.length === 0) {
            addNotification('warning', 'Agrega al menos una línea para guardar el borrador.');
            return;
        }
        handleSubmit('BORRADOR');
    };

    return (
        <div className="space-y-1 pb-28 max-w-[1300px] mx-auto">
            {/* Header / Nav */}
            <div className="md:sticky top-16 z-40 bg-[var(--color-background)]/80 backdrop-blur-md py-1.5 flex items-center justify-between transition-all">
                <Button variant="ghost" onClick={onBack} size="sm" className="flex items-center gap-2">
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="hidden sm:inline">Volver</Text>
                </Button>
                <Title variant="h5" weight="bold" color="text-primary" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap md:text-xl">
                    REPORTE DE GASTOS
                </Title>
                <div className="w-10 md:w-20"></div>
            </div>

            {/* Info Tarjeta Azul */}
            <UserSummaryCard user={user} />

            {/* Banner de Borrador Guardado */}
            {hasBackup && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-full text-white shadow-lg shadow-blue-500/20">
                            <Save size={18} />
                        </div>
                        <div>
                            <Text weight="bold" className="text-blue-900 dark:text-blue-100">Borrador Protegido</Text>
                            <Text variant="caption" className="text-blue-700 dark:text-blue-400">Detectamos que estabas llenando un reporte antes de abrir esta consulta.</Text>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            if (restoreBackup()) {
                                addNotification('success', 'Borrador recuperado correctamente.');
                            }
                        }}
                        variant="primary"
                        size="sm"
                        className="rounded-xl px-6"
                    >
                        RECUPERAR MI TRABAJO
                    </Button>
                </div>
            )}

            {/* Command Center: Totales y Acciones Principales */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-3 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Totales */}
                    <div className="flex-1 w-full">
                        <ExpenseTotals
                            totalFacturado={totalFacturado}
                            totalSinFactura={totalSinFactura}
                            totalGeneral={totalGeneral}
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                        {observacionesGral.match(/\[(REP-L\d+)\]/) && (
                            <Badge variant="success" size="lg" className="font-black px-4 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 w-full sm:w-auto justify-center">
                                {observacionesGral.match(/\[(REP-L\d+)\]/)?.[1]}
                            </Badge>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                onClick={handleSaveDraft}
                                disabled={isLoading}
                                variant="erp"
                                size="md"
                                icon={Save}
                                className="h-11 sm:h-10 flex-1 sm:flex-initial font-bold rounded-xl bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-none px-4 sm:px-6"
                            >
                                GUARDAR
                            </Button>
                            <Button
                                onClick={handlePrepareSubmit}
                                disabled={isLoading}
                                loading={isLoading}
                                variant="erp"
                                size="md"
                                className="h-11 sm:h-10 grow sm:flex-initial font-black rounded-xl shadow-lg shadow-[var(--color-primary)]/10 px-6 sm:px-8"
                            >
                                {isLoading ? 'ENVIANDO...' : 'ENVIAR REPORTE'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 mt-8">
                {/* Cabecera de Tabla: Barra de Título y Acciones (Responsive Inteligente) */}
                <div className="flex flex-row items-center justify-between px-3 sm:px-4 py-2 bg-[var(--color-surface-variant)]/40 border-b border-[var(--color-border)] gap-2 rounded-t-2xl min-h-[48px]">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full hidden sm:block"></div>
                        <Title variant="h6" weight="bold" className="text-[10px] sm:text-xs tracking-tight uppercase whitespace-nowrap flex items-center gap-1">
                            ÍTEMS <span className="hidden sm:inline">DEL REPORTE</span>
                            <Text as="span" variant="caption" className="font-medium opacity-40 lowercase text-[9px] sm:text-[10px]">
                                ({lineas.length})
                            </Text>
                        </Title>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 ml-auto">
                        <Button
                            onClick={() => setShowClearModal(true)}
                            variant="erp"
                            size="xs"
                            icon={Trash2}
                            className="font-bold rounded-lg px-2 sm:px-2.5 py-1 text-red-600 border-red-100 hover:bg-red-50 text-[9px] w-fit shadow-sm bg-white dark:bg-black/20"
                        >
                            LIMPIAR
                        </Button>
                        <Button
                            onClick={addLinea}
                            variant="erp"
                            size="xs"
                            icon={Plus}
                            className="font-bold rounded-lg px-2 sm:px-2.5 py-1 text-[var(--color-primary)] text-[9px] w-fit shadow-sm bg-white dark:bg-black/20"
                        >
                            <span className="hidden sm:inline">AGREGAR GASTO</span>
                        </Button>
                        <Button
                            onClick={() => {
                                if (reporteIdOriginal) {
                                    setShowDeleteReportModal(true);
                                } else {
                                    clearForm();
                                    onBack();
                                }
                            }}
                            variant="erp"
                            size="xs"
                            icon={Trash2}
                            className="font-bold rounded-lg px-2 sm:px-2.5 py-1 text-red-600 border-red-100 hover:bg-red-50 text-[9px] w-fit shadow-sm bg-white dark:bg-black/20"
                        >
                            <span className="hidden sm:inline">{reporteIdOriginal ? 'BORRAR' : 'DESCARTAR'}</span>
                        </Button>
                    </div>
                </div>

                {/* VISTA DESKTOP (Tabla con Scroll Interno) */}
                <div className={`hidden md:block bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm ${isSearchingOT ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <div className={`max-h-[470px] scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent ${isSearchingOT ? 'overflow-visible' : 'overflow-auto'}`}>
                        <table className="w-full border-separate border-spacing-0">
                            <thead className="bg-[#002060] sticky top-0 z-[40] shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-10 border-b border-white/10">#</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white min-w-[150px] border-b border-white/10">Categoría</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-40 border-b border-white/10">Fecha</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white min-w-[120px] border-b border-white/10">OT / OS</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-32 border-b border-white/10">C. Costo</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-32 border-b border-white/10">Subcentro</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white w-36 border-b border-white/10">Val. Factura</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white w-36 border-b border-white/10">Val. Sin Fac.</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white border-b border-white/10">Observaciones</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-12 border-b border-white/10">Adj.</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-16 border-b border-white/10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent">
                                {lineas.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center">
                                            <Text className="opacity-40 italic">No hay gastos reportados. Haz clic en "Agregar Gasto".</Text>
                                        </td>
                                    </tr>
                                ) : (
                                    lineas.map((linea, index) => (
                                        <ExpenseLineItem
                                            key={linea.id}
                                            linea={linea}
                                            index={index}
                                            isSearchingOT={isSearchingOT}
                                            ots={ots}
                                            updateLinea={updateLinea}
                                            removeLinea={removeLinea}
                                            handleOTSearch={handleOTSearch}
                                            selectOT={selectOT}
                                            setLineas={setLineas}
                                            errors={validationErrors[linea.id] || []}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* VISTA MÓVIL (Tarjetas con Scroll Natural) */}
                <div className="md:hidden space-y-4">
                    {lineas.length === 0 ? (
                        <div className="p-10 text-center bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] border-dashed">
                            <Text className="opacity-40 italic">No hay gastos reportados. Haz clic en "Agregar Gasto".</Text>
                        </div>
                    ) : (
                        lineas.map((linea, index) => (
                            <ExpenseMobileCard
                                key={linea.id}
                                linea={linea}
                                index={index}
                                isSearchingOT={isSearchingOT}
                                ots={ots}
                                updateLinea={updateLinea}
                                removeLinea={removeLinea}
                                handleOTSearch={handleOTSearch}
                                selectOT={selectOT}
                                setLineas={setLineas}
                                errors={validationErrors[linea.id] || []}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Observaciones Generales Inferior */}
            <div className="space-y-2 mt-6 px-1">
                <Text as="label" variant="caption" weight="bold" className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest opacity-70 px-1">
                    Observaciones Generales
                </Text>
                <Textarea
                    placeholder="Escribe aquí cualquier observación adicional..."
                    value={observacionesGral}
                    onChange={(e) => setObservacionesGral(e.target.value)}
                    rows={4}
                    className="w-full bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all text-sm shadow-sm"
                />
            </div>

            <ExpenseConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={() => handleSubmit('PRE-INICIAL')}
                totalGeneral={totalGeneral}
                totalFacturado={totalFacturado}
                totalSinFactura={totalSinFactura}
            />

            {/* Modal de Confirmación de Limpieza */}
            <ClearReportConfirmModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={() => {
                    clearForm();
                    addNotification('info', 'Reporte limpiado completamente.');
                }}
            />
            {/* Modal de Confirmación de Borrado Permanente */}
            <DeleteReportConfirmModal
                isOpen={showDeleteReportModal}
                onClose={() => setShowDeleteReportModal(false)}
                onConfirm={handleDeleteReport}
                reportCode={observacionesGral.match(/\[(REP-L\d+)\]/)?.[1]}
                isLoading={isDeletingReport}
            />
        </div>
    );
};

export default ExpenseLegalization;
