import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import { Button, Text, Title, MaterialCard, Spinner } from '../../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';

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
    onSelectReport: (reporteId: string) => void;
}

const TransitReportsView: React.FC<TransitReportsViewProps> = ({ user, onBack, onSelectReport }) => {
    const [reportes, setReportes] = useState<ReporteResumen[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReportes = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/viaticos/reportes/${user.cedula || user.id}`);
                setReportes(res.data);
            } catch (err) {
                console.error("Error fetching transit reports:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReportes();
    }, [user]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 px-0 hover:bg-transparent">
                    <ArrowLeft size={20} />
                    <Text weight="medium">Volver</Text>
                </Button>
                <Title variant="h4" weight="bold" color="navy" className="text-xl md:text-2xl">
                    MIS LEGALIZACIONES
                </Title>
                <div className="w-10"></div>
            </div>

            <MaterialCard className="p-4 bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20 shadow-none">
                <div className="flex gap-3">
                    <div className="bg-amber-500/20 p-2 rounded-lg text-amber-600 dark:text-amber-400 h-fit">
                        <Clock size={20} />
                    </div>
                    <div>
                        <Text weight="bold" color="text-primary" className="text-sm">RESUMEN EN TRÁNSITO</Text>
                        <Text variant="body2" color="text-secondary" className="text-xs leading-relaxed flex items-center gap-1.5 flex-wrap">
                            A continuación se muestran los gastos agrupados por reporte. Haz clic en
                            <Button
                                variant="erp"
                                size="xs"
                                className="px-1.5 py-0.5 text-[9px] uppercase tracking-tighter shadow-none pointer-events-none h-auto min-h-0"
                            >
                                modificar
                            </Button>
                            para editar las líneas de un reporte.
                        </Text>
                    </div>
                </div>
            </MaterialCard>

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
                    {/* Vista de Tarjetas (Móvil) */}
                    <div className="grid grid-cols-1 gap-4 lg:hidden">
                        {reportes.map((reporte) => (
                            <MaterialCard key={reporte.reporte_id} className="p-4 border-[var(--color-border)] hover:border-blue-500/50 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter text-[10px]">Radicado</Text>
                                        <div className="mt-0.5">
                                            <Text
                                                variant="caption"
                                                weight="bold"
                                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] border border-blue-100 dark:border-blue-800/50 inline-block"
                                            >
                                                {reporte.codigolegalizacion}
                                            </Text>
                                        </div>
                                    </div>
                                    <Text
                                        variant="caption"
                                        weight="bold"
                                        className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]"
                                    >
                                        {reporte.estado}
                                    </Text>
                                </div>

                                <div className="grid grid-cols-2 gap-y-3 mb-4">
                                    <div>
                                        <Text variant="caption" color="text-secondary" className="text-[10px] uppercase">Fecha</Text>
                                        <Text className="text-xs">{reporte.fechaaplicacion}</Text>
                                    </div>
                                    <div>
                                        <Text variant="caption" color="text-secondary" className="text-[10px] uppercase">Valor Total</Text>
                                        <Text weight="bold" className="text-sm text-primary">${reporte.valortotal.toLocaleString()}</Text>
                                    </div>
                                    <div className="col-span-2">
                                        <Text variant="caption" color="text-secondary" className="text-[10px] uppercase">Área / C. Costo</Text>
                                        <Text className="text-xs">{reporte.area} - {reporte.centrocosto}</Text>
                                    </div>
                                    <div className="col-span-2">
                                        <Text variant="caption" color="text-secondary" className="text-[10px] uppercase">Ciudad</Text>
                                        <Text className="text-xs">{reporte.ciudad}</Text>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
                                    <Button
                                        variant="erp"
                                        size="sm"
                                        onClick={() => onSelectReport(reporte.reporte_id)}
                                        className="w-full sm:w-auto font-bold px-4"
                                    >
                                        Modificar
                                    </Button>
                                </div>
                            </MaterialCard>
                        ))}
                    </div>

                    {/* Vista de Tabla (Escritorio) */}
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
                                {reportes.map((reporte) => (
                                    <tr key={reporte.reporte_id} className="hover:bg-[var(--color-primary)]/5 transition-colors text-[11px]">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <Button
                                                variant="erp"
                                                size="xs"
                                                onClick={() => onSelectReport(reporte.reporte_id)}
                                                className="font-bold px-2 py-0.5 text-[9px] uppercase tracking-tighter shadow-none border-slate-200"
                                            >
                                                modificar
                                            </Button>
                                        </td>
                                        <td className="px-2 py-2 font-medium opacity-50 whitespace-nowrap">{reporte.codigo}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <Text
                                                variant="caption"
                                                weight="bold"
                                                className="px-1.5 py-0.5 rounded bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[9px] border border-blue-100 dark:border-blue-800/50 inline-block whitespace-nowrap"
                                            >
                                                {reporte.codigolegalizacion}
                                            </Text>
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
                                                className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 dark:bg-amber-900/40 dark:text-amber-400 text-[8px] border border-amber-200/50 dark:border-amber-800/50 uppercase tracking-tighter"
                                            >
                                                {reporte.estado}
                                            </Text>
                                        </td>
                                        <td className="px-2 py-2 max-w-[150px] truncate opacity-50 text-[10px]" title={reporte.observaciones}>
                                            {reporte.observaciones || '---'}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap font-medium opacity-70">{reporte.centrocosto || '---'}</td>
                                        <td className="px-2 py-2 italic opacity-50 text-[10px] truncate max-w-[120px]" title={reporte.cargo}>{reporte.cargo}</td>
                                        <td className="px-2 py-2 whitespace-nowrap opacity-70">{reporte.ciudad}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransitReportsView;
