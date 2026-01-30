import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import { Button, Text, Title, MaterialCard, Spinner } from '../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface ReporteResumen {
    reporte_id: string;
    fecha: string;
    estado: string;
    total_con_factura: number;
    total_sin_factura: number;
    cantidad_lineas: number;
    ciudad: string;
}

interface TransitReportsViewProps {
    user: any;
    onBack: () => void;
}

const TransitReportsView: React.FC<TransitReportsViewProps> = ({ user, onBack }) => {
    const [reportes, setReportes] = useState<ReporteResumen[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReportes = async () => {
            try {
                // El endpoint en el backend usa el prefijo /api/v2/viaticos definido en el router y main
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
                    Reportes en Tránsito
                </Title>
                <div className="w-10"></div>
            </div>

            <MaterialCard className="p-4 bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20 shadow-none">
                <div className="flex gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-600 dark:text-blue-400 h-fit">
                        <Clock size={20} />
                    </div>
                    <div>
                        <Text weight="bold" color="text-primary" className="text-sm">Información de Envío</Text>
                        <Text variant="body2" color="text-secondary" className="text-xs leading-relaxed">
                            Aquí visualizas los reportes que ya enviaste al portal pero que aún no han sido procesados hacia el ERP (Solid).
                        </Text>
                    </div>
                </div>
            </MaterialCard>

            {isLoading ? (
                <div className="py-20 text-center">
                    <Spinner size="lg" />
                    <Text className="mt-4" color="text-secondary">Cargando tus reportes...</Text>
                </div>
            ) : reportes.length === 0 ? (
                <div className="py-20 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)]">
                    <FileText className="mx-auto text-[var(--color-text-secondary)] opacity-10 mb-4" size={64} />
                    <Text weight="medium" color="text-secondary">No tienes reportes pendientes en tránsito.</Text>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportes.map((reporte) => (
                        <MaterialCard key={reporte.reporte_id} className="p-5 hover:border-[var(--color-primary)] transition-all flex flex-col justify-between group cursor-default">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="bg-[var(--color-surface-variant)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                                        <Text variant="caption" weight="bold" className="text-[10px] uppercase opacity-70">ID: {reporte.reporte_id.substring(0, 8)}...</Text>
                                    </div>
                                    <div className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                        {reporte.estado}
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <Text variant="caption" className="opacity-60 text-[11px]">Fecha Registro:</Text>
                                        <Text variant="body2" weight="bold" className="text-[12px]">{new Date(reporte.fecha).toLocaleDateString('es-CO')} {new Date(reporte.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Text variant="caption" className="opacity-60 text-[11px]">Sede/Ciudad:</Text>
                                        <Text variant="body2" weight="bold" className="text-[12px]">{reporte.ciudad}</Text>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Text variant="caption" className="opacity-60 text-[11px]">Total Líneas:</Text>
                                        <Text variant="body2" weight="bold" className="text-[12px]">{reporte.cantidad_lineas} ítems</Text>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--color-border)] flex justify-between items-end">
                                    <div>
                                        <Text variant="caption" className="opacity-60 block text-[10px] uppercase mb-0.5">Monto Total</Text>
                                        <Text variant="h4" weight="bold" color="primary" className="text-lg">
                                            ${(reporte.total_con_factura + reporte.total_sin_factura).toLocaleString()}
                                        </Text>
                                    </div>
                                    <div className="bg-[var(--color-surface-variant)] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <FileText size={18} className="text-[var(--color-primary)]" />
                                    </div>
                                </div>
                            </div>
                        </MaterialCard>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransitReportsView;
