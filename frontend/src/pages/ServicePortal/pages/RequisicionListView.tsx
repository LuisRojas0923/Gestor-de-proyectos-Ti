import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, User, Briefcase, ChevronRight, Info } from 'lucide-react';
import axios from 'axios';
import { StatusBadge } from './Common';
import { Button, Input, Title, Text, Icon } from '../../../components/atoms';
import { API_CONFIG } from '../../../config/api';
import { useAppContext } from '../../../context/AppContext';

interface Requisicion {
    id: string;
    nombre_proyecto: string;
    cargo_nombre: string;
    estado: string;
    fecha_creacion: string;
    solicitante_nombre: string;
    id_creador?: string;
    area_destino: string;
}

interface RequisicionListViewProps {
    onBack: () => void;
    onViewDetail?: (requisicion: Requisicion) => void;
}

const API_BASE_URL = API_CONFIG.BASE_URL;

const RequisicionListView: React.FC<RequisicionListViewProps> = ({ onBack, onViewDetail }) => {
    const { state } = useAppContext();
    const { user } = state;

    const [requisiciones, setRequisiciones] = useState<Requisicion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'mias' | 'aprobar'>('mias');

    useEffect(() => {
        const fetchRequisiciones = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_BASE_URL}/requisiciones/`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                setRequisiciones(res.data as Requisicion[]);
            } catch (err) {
                console.error("Error fetching requisiciones:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequisiciones();
    }, []);

    const userAreas = JSON.parse(user?.areas_asignadas || '[]') as string[];
    const userEspecialidades = JSON.parse(user?.especialidades || '[]') as string[];
    const isJefe = userAreas.length > 0;
    const isGH = userEspecialidades.includes('gestion_humana');
    const hasApprovalRights = isJefe || isGH || user?.rol === 'admin';

    // Set default tab to 'aprobar' if they are approvers and have no created requests? 
    // Usually 'mias' is fine. We'll leave it 'mias'.

    const filteredRequisiciones = requisiciones.filter(req => {
        // Text Search Filter
        const matchesSearch =
            req.nombre_proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.cargo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Tab Filter
        if (activeTab === 'mias') {
            return req.id_creador === user?.id || !req.id_creador; // if no creator let it show or strict match
        } else if (activeTab === 'aprobar') {
            if (user?.rol === 'admin') return true;

            // Para "Aprobaciones e Historial" mostramos todo lo relacionado al área o GH
            if (isJefe && userAreas.includes(req.area_destino)) return true;
            if (isGH && ['Pendiente de GH', 'Aprobada', 'Rechazada'].includes(req.estado)) return true;

            return false;
        }

        return true;
    });

    return (
        <div className="space-y-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    icon={ArrowLeft}
                    className="font-bold p-0"
                >
                    Volver
                </Button>
                <div className="w-full sm:w-64">
                    <Input
                        type="text"
                        placeholder="Buscar requisición..."
                        icon={Search}
                        size="sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Title variant="h3" weight="bold" color="text-primary text-2xl uppercase tracking-tight">Requisiciones de Personal</Title>
                    <Text as="span" variant="caption" weight="bold" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-4 py-1.5 rounded-xl border border-[var(--color-primary)]/20 transition-all text-center">Total: {filteredRequisiciones.length}</Text>
                </div>

                {hasApprovalRights && (
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl w-full max-w-md">
                        <button
                            onClick={() => setActiveTab('mias')}
                            className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all ${activeTab === 'mias' ? 'bg-white dark:bg-neutral-700 shadow-sm text-[var(--color-primary)]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mis Solicitudes
                        </button>
                        <button
                            onClick={() => setActiveTab('aprobar')}
                            className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all ${activeTab === 'aprobar' ? 'bg-white dark:bg-neutral-700 shadow-sm text-[var(--color-primary)]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Aprobaciones e Historial
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
                        <Text variant="body1" color="text-secondary">Cargando solicitudes...</Text>
                    </div>
                ) : filteredRequisiciones.length > 0 ? (
                    <div className="space-y-3">
                        {filteredRequisiciones.map(req => (
                            <div
                                key={req.id}
                                onClick={() => onViewDetail?.(req)}
                                className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all duration-300 overflow-hidden group ${onViewDetail ? 'cursor-pointer' : ''}`}
                            >
                                <div className="p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                                        {/* ID & Proyecto - Flex 1.5 */}
                                        <div className="flex-1 sm:flex-[1.5] min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <Text variant="body2" weight="bold" className="font-mono text-[var(--color-text-secondary)] uppercase tracking-tight bg-[var(--color-surface-variant)]/50 px-2.5 py-1 rounded-lg shrink-0">
                                                    {req.id}
                                                </Text>
                                                <Title variant="h6" weight="bold" color="text-primary" className="leading-tight group-hover:text-[var(--color-primary)] transition-colors truncate">
                                                    {req.nombre_proyecto}
                                                </Title>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Icon name={Briefcase} size="xs" className="text-[var(--color-text-secondary)]/50 shrink-0" />
                                                <Text variant="caption" color="text-secondary" className="uppercase font-medium tracking-wide truncate">
                                                    {req.cargo_nombre}
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Solicitante - Flex 1.5 */}
                                        <div className="hidden md:flex flex-[1.5] items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/5 flex items-center justify-center shrink-0 border border-[var(--color-primary)]/10">
                                                <Icon name={User} size="sm" className="text-[var(--color-primary)]/70" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <Text variant="caption" color="text-secondary" className="uppercase text-[9px] font-bold tracking-widest opacity-50 mb-0.5">Solicitante</Text>
                                                <Text variant="body2" color="text-primary" weight="bold" className="truncate leading-tight">
                                                    {req.solicitante_nombre}
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Fecha - Flex 1 */}
                                        <div className="hidden sm:flex flex-[1] items-center gap-2.5 shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                                <Icon name={Clock} size="xs" className="text-neutral-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <Text variant="caption" color="text-secondary" className="uppercase text-[9px] font-bold tracking-widest opacity-50 mb-0.5">Fecha</Text>
                                                <Text variant="body2" color="text-primary" weight="medium">
                                                    {new Date(req.fecha_creacion).toLocaleDateString()}
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Estado - Flex 1 */}
                                        <div className="flex-shrink-0 sm:flex-[1] flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                            <StatusBadge status={req.estado} />
                                            {onViewDetail && (
                                                <div className="group-hover:translate-x-1 transition-transform">
                                                    <ChevronRight size={18} className="text-[var(--color-primary)]/60" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-[2.5rem] p-16 text-center space-y-4 transition-colors">
                        <div className="bg-[var(--color-surface-variant)] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-[var(--color-text-secondary)]/30">
                            <Icon name={Info} size="xl" className="w-10 h-10" />
                        </div>
                        <Text variant="body1" color="text-secondary" weight="bold">
                            {searchTerm ? 'No se encontraron requisiciones que coincidan con tu búsqueda.' : 'No tienes requisiciones registradas aún.'}
                        </Text>
                        {searchTerm && (
                            <Button variant="ghost" onClick={() => setSearchTerm('')} color="primary" size="sm">Limpiar búsqueda</Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequisicionListView;
