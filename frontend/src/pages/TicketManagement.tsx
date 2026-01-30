import {
    Search,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    FilterX,
    Inbox,
    RefreshCw,
    UserCheck
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { Select, Input, Title, Text, Icon } from '../components/atoms';

interface Ticket {
    id: string;
    asunto: string;
    estado: string;
    prioridad: string;
    nombre_creador: string;
    fecha_creacion: string;
    asignado_a?: string;
}

const formatName = (name: string) => {
    if (!name) return "Sin asignar";
    return name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

const TicketManagement: React.FC = () => {
    const { state } = useAppContext();
    const { user } = state;
    const { get } = useApi<Ticket[]>();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const data = await get('/soporte/');
                if (data) {
                    setTickets(data);
                    setFilteredTickets(data);
                }
            } catch (error) {
                console.error("Error cargando tickets:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTickets();
    }, [get]);

    useEffect(() => {
        let result = tickets;

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(t =>
                (t.asunto?.toLowerCase() || '').includes(search) ||
                (t.id?.toLowerCase() || '').includes(search) ||
                (t.nombre_creador?.toLowerCase() || '').includes(search)
            );
        }

        if (statusFilter !== 'Todos') {
            result = result.filter(t => t.estado === statusFilter);
        }

        setFilteredTickets(result);
    }, [searchTerm, statusFilter, tickets]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Nuevo':
            case 'Abierto': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'En Proceso': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Cerrado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Escalado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'Alta':
            case 'Crítica': return 'text-red-500';
            case 'Media': return 'text-yellow-500';
            default: return 'text-green-500';
        }
    };

    const statusCounts = {
        total: filteredTickets.length,
        abierto: filteredTickets.filter(t => t.estado === 'Abierto' || t.estado === 'Nuevo').length,
        enProceso: filteredTickets.filter(t => t.estado === 'En Proceso').length,
        cerrado: filteredTickets.filter(t => t.estado === 'Cerrado').length,
    };

    return (
        <div className="space-y-8 pb-10 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Title variant="h3" weight="bold" color="text-primary" className="mb-1">
                        Gestión de Tickets
                    </Title>
                    <div className="flex items-center space-x-2">
                        <Text variant="body1" color="text-secondary" weight="medium" className="tracking-tight">
                            Administración de solicitudes de soporte técnico
                        </Text>
                        {user?.role === 'analyst' && (
                            <div className="flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800">
                                <Icon name={UserCheck} size="xs" className="text-blue-500 mr-1" />
                                <Text variant="caption" weight="bold" className="text-blue-600 dark:text-blue-400">Mis asignaciones</Text>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="relative w-64">
                        <Input
                            type="text"
                            placeholder="Buscar por ID, asunto o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={Search}
                            className="bg-transparent border-none focus:ring-0"
                        />
                    </div>

                    <div className="w-64">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: "Todos", label: "Todos los estados" },
                                { value: "Nuevo", label: "Nuevo" },
                                { value: "Abierto", label: "Abierto" },
                                { value: "En Proceso", label: "En Proceso" },
                                { value: "Pendiente Info", label: "Pendiente Info" },
                                { value: "Escalado", label: "Escalado" },
                                { value: "Cerrado", label: "Cerrado" },
                            ]}
                            className="bg-[var(--color-surface)]"
                        />
                    </div>
                </div>
            </div>

            {/* Status Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tickets', count: statusCounts.total, color: 'blue', icon: Inbox },
                    { label: 'Abiertos / Nuevos', count: statusCounts.abierto, color: 'blue', icon: AlertCircle },
                    { label: 'En Proceso', count: statusCounts.enProceso, color: 'yellow', icon: RefreshCw },
                    { label: 'Cerrados', count: statusCounts.cerrado, color: 'green', icon: CheckCircle },
                ].map((card) => (
                    <div key={card.label} className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-border)] shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-xl bg-${card.color}-100 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
                                <Icon name={card.icon} size="sm" />
                            </div>
                            <Text variant="h5" weight="bold" color="text-primary">{card.count}</Text>
                        </div>
                        <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">{card.label}</Text>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <Text variant="body2" color="text-secondary" weight="medium">Cargando tickets...</Text>
                </div>
            ) : filteredTickets.length > 0 ? (
                <div className="bg-[var(--color-surface)] rounded-[2.5rem] overflow-hidden border border-[var(--color-border)] shadow-xl shadow-black/5">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-variant)]/30">
                                <th className="px-6 py-5"><Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-50 text-[10px]">ID</Text></th>
                                <th className="px-6 py-5"><Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-50 text-[10px]">Asunto / Solicitante</Text></th>
                                <th className="px-6 py-5 text-center"><Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-50 text-[10px]">Prioridad</Text></th>
                                <th className="px-6 py-5 text-center"><Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-50 text-[10px]">Estado</Text></th>
                                <th className="px-6 py-5"><Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-50 text-[10px]">Responsable</Text></th>
                                <th className="px-6 py-5 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-neutral-700">
                            {filteredTickets.map((ticket) => (
                                <tr
                                    key={ticket.id}
                                    className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-5 font-mono text-xs text-gray-400" onClick={() => navigate(`/tickets/${ticket.id}`)}>{ticket.id}</td>
                                    <td className="px-6 py-5" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <div>
                                            <Text variant="body2" weight="bold" color="text-primary" className="group-hover:text-[var(--color-primary)] transition-colors mb-0.5">
                                                {ticket.asunto}
                                            </Text>
                                            <Text variant="caption" color="text-secondary" weight="medium">{ticket.nombre_creador}</Text>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <div className={`w-2 h-2 rounded-full ${getPriorityStyle(ticket.prioridad).replace('text', 'bg')}`}></div>
                                            <Text as="span" variant="caption" weight="bold" className={getPriorityStyle(ticket.prioridad)}>{ticket.prioridad}</Text>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <Text as="span" variant="caption" weight="bold" className={`px-3 py-1.5 rounded-xl tracking-wider text-[10px] ${getStatusStyle(ticket.estado)}`}>
                                            {(ticket.estado || 'NUEVO').toUpperCase()}
                                        </Text>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${ticket.asignado_a ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-gray-100 text-gray-400 dark:bg-neutral-800'}`}>
                                                {ticket.asignado_a ? ticket.asignado_a.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <Text variant="caption" weight="bold" color={ticket.asignado_a ? "text-primary" : "text-secondary"} className={!ticket.asignado_a ? "opacity-50 italic" : ""}>
                                                {formatName(ticket.asignado_a || "")}
                                            </Text>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-20 text-center bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-xl shadow-black/5">
                    <div className="w-16 h-16 bg-[var(--color-background)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name={FilterX} size="lg" className="text-[var(--color-text-secondary)]/30" />
                    </div>
                    <Title variant="h6" weight="bold" className="mb-2" color="text-primary">No se encontraron tickets</Title>
                    <Text variant="body2" color="text-secondary" weight="medium">Prueba ajustando los filtros o el término de búsqueda.</Text>
                </div>
            )}
        </div>
    );
};

export default TicketManagement;
