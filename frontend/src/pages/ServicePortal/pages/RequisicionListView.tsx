import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, User, Briefcase, ChevronRight, Info } from 'lucide-react';
import axios from 'axios';
import { StatusBadge } from './Common';
import { Button, Input, Title, Text, Icon } from '../../../components/atoms';
import { API_CONFIG } from '../../../config/api';

interface Requisicion {
    id: string;
    nombre_proyecto: string;
    cargo_nombre: string;
    estado: string;
    fecha_creacion: string;
    solicitante_nombre: string;
}

interface RequisicionListViewProps {
    onBack: () => void;
    onViewDetail?: (requisicion: Requisicion) => void;
}

const API_BASE_URL = API_CONFIG.BASE_URL;

const RequisicionListView: React.FC<RequisicionListViewProps> = ({ onBack, onViewDetail }) => {
    const [requisiciones, setRequisiciones] = useState<Requisicion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredRequisiciones = requisiciones.filter(req =>
        req.nombre_proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.cargo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <div className="flex items-center justify-between">
                    <Title variant="h3" weight="bold" color="text-primary text-2xl uppercase tracking-tight">Mis Requisiciones</Title>
                    <Text as="span" variant="caption" weight="bold" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-4 py-1.5 rounded-xl border border-[var(--color-primary)]/20 transition-all">Total: {filteredRequisiciones.length}</Text>
                </div>

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
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="shrink-0">
                                            <div className="flex items-center gap-3">
                                                <Text variant="body2" weight="bold" className="font-mono text-[var(--color-text-secondary)] uppercase tracking-tight bg-[var(--color-surface-variant)]/50 px-2.5 py-1 rounded-lg">
                                                    {req.id}
                                                </Text>
                                                <Title variant="h6" weight="bold" color="text-primary" className="leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                                                    {req.nombre_proyecto}
                                                </Title>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Icon name={Briefcase} size="xs" className="text-[var(--color-text-secondary)]/50 shrink-0" />
                                                <Text variant="caption" color="text-secondary" className="uppercase font-medium tracking-wide truncate">
                                                    {req.cargo_nombre}
                                                </Text>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex items-center gap-1.5 shrink-0">
                                            <Icon name={User} size="sm" className="text-[var(--color-text-secondary)]/70 shrink-0" />
                                            <Text variant="body2" color="text-secondary" weight="medium">
                                                {req.solicitante_nombre}
                                            </Text>
                                        </div>

                                        <div className="hidden sm:flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                            <Icon name={Clock} size="sm" className="text-[var(--color-text-secondary)]/70" />
                                            <Text variant="body2" color="text-secondary" weight="medium">
                                                {new Date(req.fecha_creacion).toLocaleDateString()}
                                            </Text>
                                        </div>

                                        <div className="shrink-0">
                                            <StatusBadge status={req.estado} />
                                        </div>

                                        {onViewDetail && (
                                            <div className="hidden sm:block shrink-0 group-hover:translate-x-1 transition-transform">
                                                <ChevronRight size={18} className="text-[var(--color-primary)]/60" />
                                            </div>
                                        )}
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
