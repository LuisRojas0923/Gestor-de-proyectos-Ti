import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Trash2, Plus } from 'lucide-react';
import { Button, Text, Title, MaterialCard, Spinner, Switch } from '../../../components/atoms';
import { DeleteReportConfirmModal } from '../../../components/molecules';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface ReporteResumen {
    codigo: number;
    codigolegalizacion: string;
    fecha: string;
    hora: string;
    fechaaplicacion: string;
    empleado: string;
    nombreempleado: string;
    area: string;
    valortotal: number;
    estado: string;
    usuario: string;
    observaciones: string;
    anexo: number;
    centrocosto: string;
    cargo: string;
    ciudad: string;
    reporte_id: string;
}

interface TransitReportsViewProps {
    user: any;
    onBack: () => void;
    onNewReport: () => void;
    onSelectReport: (reporte: ReporteResumen) => void;
}

const getStatusBadgeClasses = (estado: string) => {
    const est = estado?.toUpperCase().trim() || '';
    if (est === 'BORRADOR') {
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800/50';
    }
    // Estados intermedios que requieren atención (Amarillo/Ámbar)
    if (est === 'INICIAL' || est === 'PENDIENTE' || est === 'EN CANJE' || est === 'AMARILLO' || est === 'REVISIÓN') {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50 shadow-sm';
    }
    // Procesados, Contabilizados o Completados (Verde/Esmeralda)
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50';
};

const TransitReportsView: React.FC<TransitReportsViewProps> = ({ user, onBack, onNewReport, onSelectReport }) => {
    const [reportes, setReportes] = useState<ReporteResumen[]>([]);
    const [reportToDelete, setReportToDelete] = useState<ReporteResumen | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const { addNotification } = useNotifications();

    const fetchReportes = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/viaticos/reportes/${user.cedula || user.id}`);
            setReportes(res.data as ReporteResumen[]);
        } catch (err) {
            console.error("Error fetching transit reports:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteReport = async () => {
        if (!reportToDelete) return;

        setIsDeleting(true);
        try {
            await axios.delete(`${API_BASE_URL}/viaticos/reporte/${reportToDelete.reporte_id}`);
            addNotification('success', 'Reporte eliminado correctamente.');
            setReportes(prev => prev.filter(r => r.reporte_id !== reportToDelete.reporte_id));
        } catch (err) {
            console.error("Error deleting report:", err);
            addNotification('error', 'Error al eliminar el reporte.');
        } finally {
            setIsDeleting(false);
            setReportToDelete(null);
        }
    };

    useEffect(() => {
        if (user?.cedula || user?.id) {
            fetchReportes();
        }
    }, [user?.cedula, user?.id]);

    const filteredReportes = showHistory
        ? reportes
        : reportes.filter(r => r.estado?.toUpperCase().trim() !== 'PROCESADO');

    return (
        <div className="space-y-6 pb-20">
            <div className="space-y-2 -mb-4">
                <div className="relative flex items-center justify-between min-h-[36px] px-1">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="text-neutral-700 hover:bg-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800 px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 z-10"
                    >
                        <ArrowLeft size={18} />
                        <Text weight="medium" className="text-base font-medium text-left text-gray-900 dark:text-gray-100 hidden sm:inline">
                            Volver
                        </Text>
                    </Button>

                    <Title variant="h4" weight="bold" color="navy" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-lg md:text-2xl uppercase text-center w-full pointer-events-none font-['Roboto']">
                        Legalización de Gastos
                    </Title>
                    <div className="w-10 md:w-20"></div>
                </div>

                {/* Botón NUEVO (0.5rem debajo del título) */}
                <div className="flex items-center justify-between px-1">
                    <div className="bg-white dark:bg-black/20 px-3 h-9 rounded-lg border border-slate-200 shadow-sm transition-all hover:border-slate-300 flex items-center justify-center">
                        <Switch
                            checked={showHistory}
                            onChange={setShowHistory}
                            label={showHistory ? 'HISTORIAL COMPLETO' : 'SOLO PENDIENTES'}
                            className="font-bold uppercase tracking-wider text-slate-500 !text-[9px]"
                        />
                    </div>

                    <Button
                        variant="erp"
                        size="xs"
                        onClick={onNewReport}
                        className="font-bold rounded-lg px-4 sm:px-5 py-1.5 text-[var(--color-primary)] text-[10px] sm:text-xs w-[132px] shadow-sm bg-white dark:bg-black/20 z-10 border border-slate-200 justify-center"
                    >
                        <Plus size={14} className="mr-1.5" />
                        <Text as="span" weight="bold" color="inherit" className="uppercase">NUEVO</Text>
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 text-center">
                    <Spinner size="lg" />
                    <Text className="mt-4" color="text-secondary">Cargando tus legalizaciones...</Text>
                </div>
            ) : reportes.length === 0 ? (
                <div className="py-20 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)]">
                    <FileText className="mx-auto text-[var(--color-text-secondary)] opacity-10 mb-4" size={64} />
                    <Text weight="medium" color="text-secondary">No tienes legalizaciones pendientes.</Text>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Tarjetas Móviles */}
                    <div className="grid grid-cols-1 gap-4 lg:hidden">
                        {filteredReportes.map((reporte) => (
                            <MaterialCard key={reporte.reporte_id} className="p-3 border-[var(--color-border)] hover:border-blue-500/50 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <Text
                                            variant="caption"
                                            weight="bold"
                                            className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] border border-blue-100 dark:border-blue-800/50"
                                        >
                                            {reporte.codigolegalizacion || 'Sin radicado'}
                                        </Text>
                                        <Text
                                            variant="caption"
                                            weight="bold"
                                            className={`px-1.5 py-0.5 rounded-full text-[8px] border uppercase tracking-tighter ${getStatusBadgeClasses(reporte.estado)}`}
                                        >
                                            {reporte.estado}
                                        </Text>
                                    </div>
                                    <Text weight="bold" className="text-sm text-primary">${reporte.valortotal.toLocaleString()}</Text>
                                </div>

                                <div className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-400 mb-2">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex flex-wrap gap-x-4">
                                            <Text as="span">{reporte.fechaaplicacion}</Text>
                                            <Text as="span">{reporte.area} - {reporte.centrocosto}</Text>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center w-full">
                                        <Text as="span">{reporte.ciudad}</Text>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setReportToDelete(reporte)}
                                            disabled={reporte.estado !== 'BORRADOR' && reporte.estado !== 'INICIAL'}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border-none shadow-none disabled:opacity-30"
                                            title="Eliminar Reporte"
                                            icon={Trash2}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-[var(--color-border)]">
                                    <Button
                                        variant="erp"
                                        size="sm"
                                        onClick={() => onSelectReport(reporte)}
                                        className="w-full font-bold"
                                    >
                                        Modificar
                                    </Button>
                                </div>
                            </MaterialCard>
                        ))}
                    </div>

                    {/* Tabla Escritorio */}
                    <div className="hidden lg:block overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-navy text-white text-[9px] uppercase tracking-wider font-bold">
                                    <th className="px-3 py-3 border-b border-[var(--color-border)]">Acción</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Cód</th>
                                    <th className="px-3 py-3 border-b border-[var(--color-border)]">Radicado</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">F. Aplicación</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Cédula</th>
                                    <th className="px-4 py-3 border-b border-[var(--color-border)]">Empleado</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Área</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Valor Total</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)] text-center">Estado</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Observaciones</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">C. Costo</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Cargo</th>
                                    <th className="px-2 py-3 border-b border-[var(--color-border)]">Ciudad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredReportes.map((reporte) => (
                                    <tr key={reporte.reporte_id} className="hover:bg-[var(--color-primary)]/5 transition-colors text-[11px]">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="erp"
                                                    size="xs"
                                                    onClick={() => onSelectReport(reporte)}
                                                    className="font-bold px-4 py-1 text-[9px] uppercase tracking-tighter shadow-none border-slate-200"
                                                >
                                                    modificar
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 font-medium opacity-50 whitespace-nowrap">{reporte.codigo}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-blue-700 font-bold">
                                            {reporte.codigolegalizacion || '---'}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap tabular-nums opacity-70">{reporte.fechaaplicacion}</td>
                                        <td className="px-2 py-2 opacity-60 tabular-nums whitespace-nowrap">{reporte.empleado}</td>
                                        <td className="px-4 py-2 font-semibold uppercase text-[10px] leading-tight max-w-[180px] truncate" title={reporte.nombreempleado}>
                                            {reporte.nombreempleado}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap opacity-70">{reporte.area}</td>
                                        <td className="px-2 py-2 font-bold text-primary whitespace-nowrap tabular-nums">
                                            ${reporte.valortotal.toLocaleString()}
                                        </td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            <Text
                                                variant="caption"
                                                weight="bold"
                                                className={`px-2 py-0.5 rounded-full text-[8px] border uppercase tracking-tighter ${getStatusBadgeClasses(reporte.estado)}`}
                                            >
                                                {reporte.estado}
                                            </Text>
                                        </td>
                                        <td className="px-2 py-2 max-w-[150px] truncate opacity-50 text-[10px]" title={reporte.observaciones}>
                                            {reporte.observaciones || '---'}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap font-medium opacity-70">{reporte.centrocosto || '---'}</td>
                                        <td className="px-2 py-2 italic opacity-50 text-[10px] truncate max-w-[120px]" title={reporte.cargo}>{reporte.cargo}</td>
                                        <td className="px-2 py-2 whitespace-nowrap opacity-70">
                                            <div className="flex items-center gap-2">
                                                <Text as="span">{reporte.ciudad}</Text>
                                                <Button
                                                    variant="erp"
                                                    size="xs"
                                                    onClick={() => setReportToDelete(reporte)}
                                                    disabled={reporte.estado !== 'BORRADOR' && reporte.estado !== 'INICIAL'}
                                                    className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 px-2 shadow-none border-none disabled:opacity-30"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <DeleteReportConfirmModal
                isOpen={!!reportToDelete}
                onClose={() => setReportToDelete(null)}
                onConfirm={handleDeleteReport}
                reportCode={reportToDelete?.codigolegalizacion}
                isLoading={isDeleting}
            />
        </div>
    );
};

export default TransitReportsView;
