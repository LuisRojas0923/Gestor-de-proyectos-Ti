import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { LineaGasto } from './useExpenseForm';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface UseExpenseSubmissionProps {
    user: any;
    lineas: LineaGasto[];
    observacionesGral: string;
    activeReporteId: string | undefined;
    setActiveReporteId: (id: string) => void;
    setCurrentEstado: (estado: string) => void;
    clearForm: () => void;
    onSuccess: () => void;
    onBack: () => void;
    setValidationErrors: (errors: Record<string, string[]>) => void;
    logMarina: (msg: string, data?: any) => void;
}

export const useExpenseSubmission = ({
    user,
    lineas,
    observacionesGral,
    activeReporteId,
    setActiveReporteId,
    setCurrentEstado,
    clearForm,
    onSuccess,
    onBack,
    setValidationErrors,
    logMarina
}: UseExpenseSubmissionProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeletingReport, setIsDeletingReport] = useState(false);
    const [categorias, setCategorias] = useState<{ label: string, value: string }[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
    const [showLockedModal, setShowLockedModal] = useState(false);
    const { addNotification } = useNotifications();

    useEffect(() => {
        const fetchCategorias = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/viaticos/categorias`);
                if (Array.isArray(response.data)) {
                    setCategorias(response.data);
                }
            } catch (err) {
                console.error("Error loading categorías:", err);
            }
        };
        fetchCategorias();
    }, []);

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
                const isManualCCValid = /^\d{4}$/.test(l.cc);
                const isManualSCCValid = /^\d{2}$/.test(l.scc);

                if (!isManualCCValid || !isManualSCCValid) {
                    lineErrors.push('ot');
                    if (!isManualCCValid) lineErrors.push('cc');
                    if (!isManualSCCValid) lineErrors.push('scc');
                    camposFaltantes.push('OT (O CC/SCC válidos)');
                }
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
            const mensajeMostrar = mensajesErrores.slice(0, 3).join(' | ') + (mensajesErrores.length > 3 ? '...' : '');
            addNotification('error', `Campos pendientes: ${mensajeMostrar}`);
            return;
        }

        setValidationErrors({});
        setShowConfirmModal(true);
    };

    const handleSubmit = async (estado: 'BORRADOR' | 'INICIAL' = 'INICIAL') => {
        setIsLoading(true);
        setShowConfirmModal(false);
        try {
            const payload = {
                reporte_id: activeReporteId || null,
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
                    fecha: l.fecha || new Date().toISOString().split('T')[0],
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

            logMarina(`🚀 [API] Enviando reporte como ${estado}`);
            const response = await axios.post(`${API_BASE_URL}/viaticos/enviar`, payload);
            const nuevoId = (response.data as any)?.reporte_id || response.data;

            if (nuevoId && typeof nuevoId === 'string') {
                logMarina(`🆔 [API] Recibido nuevo ID: ${nuevoId}`);
                setActiveReporteId(nuevoId);
            }

            if (estado === 'BORRADOR') {
                addNotification('success', 'Borrador guardado correctamente.');
                setCurrentEstado('BORRADOR');
            } else {
                clearForm();
                onSuccess();
            }
        } catch (err: any) {
            console.error(`Error guardando como ${estado}:`, err);
            let errorMessage = 'Error al procesar el reporte.';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                } else if (Array.isArray(err.response.data.detail)) {
                    errorMessage = err.response.data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
                }
            }
            addNotification('error', errorMessage);

            if (errorMessage.toUpperCase().includes('PROCESADO') || errorMessage.toUpperCase().includes('BLOQUEADO')) {
                setShowLockedModal(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteReport = async () => {
        if (!activeReporteId) return;
        setIsDeletingReport(true);
        try {
            await axios.delete(`${API_BASE_URL}/viaticos/reporte/${activeReporteId}`);
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

    return {
        isLoading,
        isDeletingReport,
        categorias,
        showConfirmModal,
        setShowConfirmModal,
        showDeleteReportModal,
        setShowDeleteReportModal,
        showLockedModal,
        setShowLockedModal,
        handlePrepareSubmit,
        handleSubmit,
        handleDeleteReport
    };
};
