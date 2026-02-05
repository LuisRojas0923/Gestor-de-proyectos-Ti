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
                <Title variant="h4" weight="bold" color="text-primary" className="text-xl md:text-2xl">
                    Mis Legalizaciones Agrupadas
                </Title>
                <div className="w-10"></div>
            </div>

            <MaterialCard className="p-4 bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20 shadow-none">
                <div className="flex gap-3">
                    <div className="bg-amber-500/20 p-2 rounded-lg text-amber-600 dark:text-amber-400 h-fit">
                        <Clock size={20} />
                    </div>
                    <div>
                        <Text weight="bold" color="text-primary" className="text-sm">Resumen de Tránsito</Text>
                        <Text variant="body2" color="text-secondary" className="text-xs leading-relaxed">
                            A continuación se muestran los gastos agrupados por reporte. Haz clic en <b>modificar</b> para editar las líneas de un reporte.
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
                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[var(--color-surface-variant)] text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-bold">
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Acción</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Cód</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Radicado</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">F. Aplicación</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Cédula</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Empleado</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Área</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Valor Total</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)] text-center">Estado</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Observaciones</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">C. Costo</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Cargo</th>
                                <th className="px-4 py-3 border-b border-[var(--color-border)]">Ciudad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {reportes.map((reporte) => (
                                <tr key={reporte.reporte_id} className="hover:bg-[var(--color-primary)]/5 transition-colors text-[12px]">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onSelectReport(reporte.reporte_id)}
                                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold px-2 py-1 h-auto"
                                        >
                                            modificar
                                        </Button>
                                    </td>
                                    <td className="px-4 py-3 font-medium opacity-70">{reporte.codigo}</td>
                                    <td className="px-4 py-3 font-bold text-blue-900 dark:text-blue-300">{reporte.codigolegalizacion}</td>
                                    <td className="px-4 py-3">{reporte.fechaaplicacion}</td>
                                    <td className="px-4 py-3 opacity-80">{reporte.empleado}</td>
                                    <td className="px-4 py-3 font-medium uppercase">{reporte.nombreempleado}</td>
                                    <td className="px-4 py-3">{reporte.area}</td>
                                    <td className="px-4 py-3 font-bold text-primary">
                                        ${reporte.valortotal.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold">
                                            {reporte.estado}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 max-w-[200px] truncate" title={reporte.observaciones}>
                                        {reporte.observaciones || '---'}
                                    </td>
                                    <td className="px-4 py-3">{reporte.centrocosto}</td>
                                    <td className="px-4 py-3 italic opacity-80">{reporte.cargo}</td>
                                    <td className="px-4 py-3">{reporte.ciudad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TransitReportsView;
