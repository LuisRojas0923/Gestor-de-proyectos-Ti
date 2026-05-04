import React, { useState, useEffect, useMemo } from 'react';
import { Title, Text, Button, Badge } from '../../../../components/atoms';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, AlertTriangle, Filter } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

type FilterType = 'all' | 'ok' | 'warnings';

const NominaPreviewView: React.FC = () => {
    const { archivoId } = useParams<{ archivoId: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    const fetchPreview = async (p: number) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/archivos/${archivoId}/preview`, {
                params: { skip: (p - 1) * 50, limit: 50 }
            });
            const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
            setRecords(items);
            if (res.data.total !== undefined) {
                setTotalPages(Math.ceil(res.data.total / 50));
            } else {
                setTotalPages(items.length === 50 ? p + 1 : p);
            }
        } catch (err) {
            console.error("Error fetching preview:", err);
            addNotification('error', 'No se pudo cargar la previsualización.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPreview(page);
    }, [archivoId, page]);

    // Contadores de estado
    const stats = useMemo(() => {
        const total = records.length;
        const ok = records.filter((r) => r.estado_validacion === 'OK').length;
        const warnings = total - ok;
        return { total, ok, warnings };
    }, [records]);

    // Filtrado de registros
    const filteredRecords = useMemo(() => {
        let base = records;
        if (activeFilter === 'ok') base = records.filter((r) => r.estado_validacion === 'OK');
        if (activeFilter === 'warnings') base = records.filter((r) => r.estado_validacion !== 'OK');

        return [...base].sort((a, b) => (a.nombre_asociado || '').localeCompare(b.nombre_asociado || ''));
    }, [records, activeFilter]);

    const isWarning = (estado: string) => estado !== 'OK';

    const getEstadoLabel = (estado: string) => {
        switch (estado) {
            case 'OK': return 'Validado';
            case 'NO_CLASIFICADO': return 'No clasificado';
            case 'NO_COINCIDE': return 'No coincide';
            case 'PENDIENTE': return 'Pendiente';
            default: return estado;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold">Previsualización de Datos</Title>
                        <Text color="text-secondary">Revisa los registros normalizados antes de finalizar</Text>
                    </div>
                </div>
                <Button variant="primary" onClick={() => navigate('/service-portal/novedades-nomina/resumen')}>
                    Ver Resumen Mensual
                </Button>
            </div>

            {/* Resumen de estado */}
            {!isLoading && records.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${activeFilter === 'all'
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            }`}
                        onClick={() => setActiveFilter('all')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <Text size="sm" color="text-secondary">Total Registros</Text>
                                <Title variant="h5" weight="bold">{stats.total}</Title>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${activeFilter === 'ok'
                            ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 ring-2 ring-green-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-green-300'
                            }`}
                        onClick={() => setActiveFilter('ok')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <Text size="sm" color="text-secondary">Validados (OK)</Text>
                                <Title variant="h5" weight="bold">{stats.ok}</Title>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${activeFilter === 'warnings'
                            ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                            }`}
                        onClick={() => setActiveFilter('warnings')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <Text size="sm" color="text-secondary">Con Advertencias</Text>
                                <Title variant="h5" weight="bold" className={stats.warnings > 0 ? 'text-amber-600' : ''}>
                                    {stats.warnings}
                                </Title>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerta de warnings */}
            {!isLoading && stats.warnings > 0 && activeFilter !== 'ok' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <Text weight="semibold" className="text-amber-800 dark:text-amber-200">
                            {stats.warnings} registro{stats.warnings !== 1 ? 's' : ''} con advertencias
                        </Text>
                        <Text size="sm" className="text-amber-700 dark:text-amber-300 mt-1">
                            Estos registros tienen un estado diferente a "OK". Podrían ser cédulas no encontradas,
                            empleados inactivos o conceptos no clasificados. Revísalos antes de continuar.
                        </Text>
                    </div>
                </div>
            )}

            {/* Tabla de datos */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <Text weight="bold">Registros Normalizados</Text>
                    <Button 
                        variant="success" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                            addNotification('success', 'Novedades confirmadas y guardadas en el histórico.');
                            navigate('/service-portal/novedades-nomina/resumen');
                        }}
                    >
                        <CheckCircle className="w-4 h-4" /> Confirmar y Guardar
                    </Button>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-center border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[var(--color-primary-900)] text-white shadow-md">
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider w-16 border-b border-white/5 border-r border-white/5 first:rounded-tl-xl">#</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">Cédula</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">Nombre</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">Empresa</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">Valor</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">Concepto</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-white/5 last:rounded-tr-xl">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {activeFilter === 'warnings' ? (
                                                <>
                                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                                    <Text color="text-secondary">No hay registros con advertencias</Text>
                                                </>
                                            ) : (
                                                <Text color="text-secondary">No se encontraron registros</Text>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.map((rec, idx) => (
                                <tr
                                    key={rec.id}
                                    className={`transition-colors ${isWarning(rec.estado_validacion)
                                        ? 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/80 dark:hover:bg-amber-900/20'
                                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    <td className="p-4 font-mono text-xs text-slate-400">{(page - 1) * 50 + idx + 1}</td>
                                    <td className="p-4 font-medium">{rec.cedula}</td>
                                    <td className="p-4 text-sm">{rec.nombre_asociado || '---'}</td>
                                    <td className="p-4 text-sm text-slate-500">{rec.empresa || '---'}</td>
                                    <td className="p-4 text-right font-mono font-bold text-blue-600">
                                        ${rec.valor?.toLocaleString() ?? '0'}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {rec.concepto?.startsWith('SEGURO HDI') ? (
                                            <Badge variant="info" size="sm">{rec.concepto}</Badge>
                                        ) : rec.concepto}
                                    </td>
                                    <td className="p-4">
                                        {rec.estado_validacion === 'OK' ? (
                                            <Badge variant="success" size="sm" className="gap-1">
                                                <CheckCircle className="w-3 h-3" /> Validado
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning" size="sm" className="gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {getEstadoLabel(rec.estado_validacion)}
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between relative z-20">
                    <Text size="sm" color="text-secondary">
                        Mostrando {filteredRecords.length} de {stats.total} registros · Página {page} de {totalPages}
                    </Text>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                        <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NominaPreviewView;
