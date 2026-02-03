import {
    Search,
    CheckCircle,
    AlertCircle,
    FilterX,
    Inbox,
    RefreshCw,
    UserCheck,
    Play,
    Eye,
    Clock,
    UserPlus
} from 'lucide-react';
import { Button } from '../components/atoms';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../components/notifications/NotificationsContext';
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
    const { get, patch } = useApi<any>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

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

    const handleQuickAction = async (e: React.MouseEvent, ticketId: string, newStatus: string) => {
        e.stopPropagation();
        if (!confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return;

        try {
            await patch(`/soporte/${ticketId}`, { estado: newStatus });
            addNotification('success', `Ticket actualizado a ${newStatus}`);
            // Recargar tickets localmente
            const updated = tickets.map(t => t.id === ticketId ? { ...t, estado: newStatus } : t);
            setTickets(updated);
        } catch (error) {
            console.error(error);
            addNotification('error', 'Error al actualizar el ticket');
        }
    };

    const handleAssignToMe = async (e: React.MouseEvent, ticketId: string) => {
        e.stopPropagation();
        if (!user) return;
        if (!confirm(`¿Deseas asignarte este ticket?`)) return;

        try {
            // Asumimos que user tiene nombre.
            const userName = (user as any).nombre || (user as any).name || (user as any).username || "Usuario Actual";
            await patch(`/soporte/${ticketId}`, { asignado_a: userName, estado: 'En Proceso' });
            addNotification('success', `Ticket asignado a ${userName}`);

            const updated = tickets.map(t => t.id === ticketId ? { ...t, asignado_a: userName, estado: 'En Proceso' } : t);
            setTickets(updated);
        } catch (error) {
            console.error(error);
            addNotification('error', 'Error al asignar el ticket');
        }
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
                <div className="space-y-2">
                    {filteredTickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                            className="group bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                        >
                            {/* Borde izquierdo azul navy fijo */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-900 dark:bg-blue-800"></div>

                            <div className="flex flex-col md:flex-row md:items-center gap-3 pl-3">
                                {/* Columna 1: ID */}
                                <div className="md:w-20 shrink-0">
                                    <Text variant="caption" className="font-mono text-[10px] text-gray-400">#{ticket.id.slice(0, 8)}</Text>
                                </div>

                                {/* Columna 2: Fecha */}
                                <div className="md:w-24 shrink-0 flex items-center text-gray-400">
                                    <Clock size={12} className="mr-1.5" />
                                    <Text variant="caption" color="text-secondary" className="text-[10px]">
                                        {new Date(ticket.fecha_creacion).toLocaleDateString()}
                                    </Text>
                                </div>

                                {/* Columna 3: Estado */}
                                <div className="md:w-32 shrink-0">
                                    <Text as="span" variant="caption" weight="bold" className={`px-2 py-0.5 rounded-md text-[9px] tracking-wider ${getStatusStyle(ticket.estado)}`}>
                                        {(ticket.estado || 'NUEVO').toUpperCase()}
                                    </Text>
                                </div>

                                {/* Columna 4: Info Principal (Asunto y Solicitante) */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center mr-4">
                                    <Text variant="body2" weight="bold" color="text-primary" className="truncate group-hover:text-[var(--color-primary)] transition-colors text-sm">
                                        {ticket.asunto}
                                    </Text>
                                    <div className="flex items-center text-gray-400 mt-0.5 space-x-2">
                                        <Icon name={UserCheck} size="xs" className="w-3 h-3" />
                                        <Text variant="caption" color="text-secondary" className="truncate text-[10px]">
                                            {ticket.nombre_creador}
                                        </Text>
                                    </div>
                                </div>

                                {/* Columna 5: Prioridad */}
                                <div className="md:w-24 shrink-0 flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityStyle(ticket.prioridad).replace('text', 'bg')}`}></div>
                                    <Text variant="caption" weight="bold" className={`${getPriorityStyle(ticket.prioridad)} text-[10px]`}>{ticket.prioridad}</Text>
                                </div>

                                {/* Columna 6: Responsable (Nombre Completo) */}
                                <div className="md:w-64 shrink-0 flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${ticket.asignado_a ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-gray-100 text-gray-400'}`}>
                                        {ticket.asignado_a ? ticket.asignado_a.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <Text variant="caption" color="text-secondary" className="text-[10px] truncate" title={ticket.asignado_a}>
                                        {formatName(ticket.asignado_a || "Sin asignar")}
                                    </Text>
                                </div>

                                {/* Columna 7: Acciones Rápidas */}
                                <div className="flex items-center justify-end md:w-36 gap-2">
                                    {(!ticket.asignado_a || (user && ticket.asignado_a !== (user as any).nombre)) && ticket.estado !== 'Cerrado' && (
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => handleAssignToMe(e, ticket.id)}
                                            className="w-9 h-9 p-0 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 shadow-sm"
                                            title="Asignarme Ticket"
                                        >
                                            <Icon name={UserPlus} size="sm" />
                                        </Button>
                                    )}

                                    {ticket.estado !== 'En Proceso' && ticket.estado !== 'Cerrado' && (
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => handleQuickAction(e, ticket.id, 'En Proceso')}
                                            className="w-9 h-9 p-0 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 shadow-sm"
                                            title="Poner En Proceso"
                                        >
                                            <Icon name={Play} size="sm" className="ml-0.5" />
                                        </Button>
                                    )}

                                    {ticket.estado === 'En Proceso' && (
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => handleQuickAction(e, ticket.id, 'Cerrado')}
                                            className="w-9 h-9 p-0 rounded-full bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 shadow-sm"
                                            title="Resolver Ticket"
                                        >
                                            <Icon name={CheckCircle} size="sm" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                        className="w-9 h-9 p-0 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 shadow-sm"
                                        title="Ver Detalle"
                                    >
                                        <Icon name={Eye} size="sm" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
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
