import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Eye, Download, Search } from 'lucide-react';
import { Button, Title, Text, Input } from '../../../../components/atoms';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { API_CONFIG } from '../../../../config/api';
import { StatusBadge } from '../../pages/Common';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface SolicitudERP {
    codigo: number;
    codigosolicitud: string;
    fecha: string;
    hora: string;
    ordentrabajo: string;
    cliente: string;
    uen: string;
    estado: string;
    observaciones: string;
}

const MisRequisicionesView: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const [solicitudes, setSolicitudes] = useState<SolicitudERP[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSolicitudes = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/erp/requisiciones/mis-solicitudes`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSolicitudes(res.data as SolicitudERP[]);
        } catch (error) {
            console.error("Error cargando solicitudes ERP", error);
            addNotification('error', 'No se pudieron cargar las solicitudes desde el ERP.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredSolicitudes = solicitudes.filter(sol =>
        sol.codigosolicitud?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sol.ordentrabajo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sol.estado?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => navigate('/service-portal/requisiciones')} icon={ArrowLeft} className="font-bold">
                        Volver al Portal
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold">Mis Solicitudes</Title>
                        <Text variant="body2" color="text-secondary">Historial de requisiciones enviadas al ERP</Text>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={fetchSolicitudes} icon={RefreshCw} disabled={isLoading}>
                        Actualizar
                    </Button>
                </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-3xl p-6 border border-[var(--color-border)] shadow-md min-h-[500px] flex flex-col">
                <div className="flex items-center mb-6">
                    <div className="w-full md:w-1/3">
                        <Input
                            label=""
                            name="search"
                            placeholder="Buscar por código, OT o estado..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e: any) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20">
                        <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-[var(--color-primary)] rounded-full" />
                        <Text color="text-secondary">Consultando histórico en ERP...</Text>
                    </div>
                ) : filteredSolicitudes.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                        <table className="w-full text-sm text-left align-middle whitespace-nowrap">
                            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Código</th>
                                    <th className="px-6 py-4 font-semibold">Fecha</th>
                                    <th className="px-6 py-4 font-semibold">OS / OT</th>
                                    <th className="px-6 py-4 font-semibold">Cliente</th>
                                    <th className="px-6 py-4 font-semibold text-center">Estado ERP</th>
                                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredSolicitudes.map(sol => (
                                    <tr key={sol.codigo} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-[var(--color-primary)]">
                                            {sol.codigosolicitud}
                                        </td>
                                        <td className="px-6 py-4">
                                            {sol.fecha} {sol.hora?.substring(0, 5)}
                                        </td>
                                        <td className="px-6 py-4">{sol.ordentrabajo}</td>
                                        <td className="px-6 py-4 truncate max-w-[200px]" title={sol.cliente}>{sol.cliente}</td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={sol.estado} />
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <Button variant="ghost" className="p-2" aria-label="Ver detalle">
                                                <Eye size={18} className="text-slate-500 hover:text-[var(--color-primary)]" />
                                            </Button>
                                            <Button variant="ghost" className="p-2" aria-label="Descargar PDF">
                                                <Download size={18} className="text-slate-500 hover:text-[var(--color-primary)]" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                            <Search size={40} />
                        </div>
                        <Title variant="h6" color="text-secondary">No se encontraron solicitudes</Title>
                        <Text variant="body2" color="text-secondary">
                            Aún no has generado ninguna requisición de materiales o no hay coincidencias con tu búsqueda.
                        </Text>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MisRequisicionesView;
