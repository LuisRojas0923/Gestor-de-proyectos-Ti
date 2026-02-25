import {
    Search,
    CheckCircle,
    AlertCircle,
    FilterX,
    Inbox,
    RefreshCw,
    UserCheck,
    Play,
    UserPlus,
    Clock
} from 'lucide-react';
import { Button } from '../../components/atoms';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useNotifications } from '../../components/notifications/NotificationsContext';
import { useApi } from '../../hooks/useApi';
import { Select, Input, Title, Text, Icon } from '../../components/atoms';
import TicketTooltip from './TicketTooltip';
import TicketActionModal from './TicketActionModal';

interface Ticket {
    id: string;
    asunto: string;
    descripcion?: string;
    estado: string;
    sub_estado?: string;
    prioridad: string;
    nombre_creador: string;
    area_creador?: string;
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

const COLUMN_WIDTHS = {
    id: "md:w-20",
    fecha: "md:w-24",
    estado: "md:w-32",
    asunto: "flex-1",
    solicitante: "md:w-64",
    area: "md:w-48",
    prioridad: "md:w-24",
    analista: "md:w-64",
    acciones: "md:w-36"
};

const TicketManagement: React.FC = () => {
    const { state } = useAppContext();
    const { user } = state;
    const { get, patch } = useApi<any>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);

    // Recuperar filtros de localStorage o usar valores por defecto
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ticket_search') || '');
    const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('ticket_status') || 'Todos');
    const [subStatusFilter, setSubStatusFilter] = useState(() => localStorage.getItem('ticket_substatus') || 'Todos');
    const [analystFilter, setAnalystFilter] = useState(() => localStorage.getItem('ticket_analyst') || 'Todos');

    const [analystOptions, setAnalystOptions] = useState<{ value: string, label: string }[]>([]);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 100;

    // Tooltip hover state
    const [hoveredTicket, setHoveredTicket] = useState<Ticket | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);

    const handleTicketMouseEnter = useCallback((e: React.MouseEvent, ticket: Ticket) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.bottom });
        setHoveredTicket(ticket);
        hoverTimeout.current = setTimeout(() => setTooltipVisible(true), 400);
    }, []);

    const handleTicketMouseLeave = useCallback(() => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setTooltipVisible(false);
        setHoveredTicket(null);
    }, []);

    // Modal de confirmación de acciones
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'assign' | 'process';
        ticketId: string;
    }>({ isOpen: false, type: 'assign', ticketId: '' });

    const SUB_STATUS_OPTIONS: Record<string, { value: string, label: string }[]> = {
        'Todos': [],
        'Pendiente': [
            { value: "Sin Asignar", label: "Sin Asignar" },
            { value: "Asignado", label: "Asignado" }
        ],
        'Proceso': [
            { value: "Proceso", label: "En Proceso" },
            { value: "Pendiente Información", label: "Pendiente Info" }
        ],
        'Cerrado': [
            { value: "Resuelto", label: "Resuelto" },
            { value: "Escalado", label: "Escalado" }
        ]
    };

    // Cargar analistas para el filtro
    const fetchAnalysts = async () => {
        try {
            const data = await get('/soporte/estadisticas/rendimiento');
            if (data && Array.isArray(data)) {
                const options = data.map((a: any) => ({
                    value: a.name,
                    label: formatName(a.name)
                }));
                // Filtrar duplicados o vacíos si es necesario, aunque el backend ya hace distinct
                setAnalystOptions(options);
            }
        } catch (error) {
            console.error("Error cargando analistas:", error);
        }
    };

    useEffect(() => {
        fetchAnalysts();
    }, []);

    // Guardar filtros en localStorage
    useEffect(() => {
        localStorage.setItem('ticket_search', searchTerm);
        localStorage.setItem('ticket_status', statusFilter);
        localStorage.setItem('ticket_substatus', subStatusFilter);
        localStorage.setItem('ticket_analyst', analystFilter);
    }, [searchTerm, statusFilter, subStatusFilter, analystFilter]);

    const fetchTickets = async (currentSkip: number, isNewSearch: boolean = false) => {
        try {
            if (isNewSearch) setIsLoading(true);
            else setIsLoadMoreLoading(true);

            const params = new URLSearchParams();
            params.append('skip', currentSkip.toString());
            params.append('limite', LIMIT.toString());
            if (statusFilter !== 'Todos') params.append('estado', statusFilter);
            if (subStatusFilter !== 'Todos') params.append('sub_estado', subStatusFilter);
            if (analystFilter !== 'Todos') params.append('asignado_a', analystFilter);
            if (searchTerm) params.append('search', searchTerm);

            const data = await get(`/soporte/?${params.toString()}`);
            if (data) {
                if (isNewSearch) {
                    setTickets(data);
                } else {
                    setTickets(prev => [...prev, ...data]);
                }
                setHasMore(data.length === LIMIT);
            }
        } catch (error) {
            console.error("Error cargando tickets:", error);
            addNotification("error", "Error al cargar tickets del servidor");
        } finally {
            setIsLoading(false);
            setIsLoadMoreLoading(false);
        }
    };

    // Efecto para búsqueda y filtros (Debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            setSkip(0);
            fetchTickets(0, true);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, subStatusFilter, analystFilter]);

    // Reset sub-estado al cambiar estado
    useEffect(() => {
        setSubStatusFilter('Todos');
    }, [statusFilter]);

    const handleLoadMore = () => {
        const nextSkip = skip + LIMIT;
        setSkip(nextSkip);
        fetchTickets(nextSkip);
    };

    // Eliminar el useEffect anterior de filtrado local ya que ahora se hace en servidor
    const filteredTickets = tickets;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pendiente': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Proceso': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Cerrado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
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
        pendiente: filteredTickets.filter(t => t.estado === 'Pendiente').length,
        proceso: filteredTickets.filter(t => t.estado === 'Proceso').length,
        cerrado: filteredTickets.filter(t => t.estado === 'Cerrado').length,
    };

    const handleQuickAction = async (e: React.MouseEvent, ticketId: string, _newStatus: string, _newSubStatus: string) => {
        e.stopPropagation();
        setActionModal({ isOpen: true, type: 'process', ticketId });
    };

    const handleAssignToMe = async (e: React.MouseEvent, ticketId: string) => {
        e.stopPropagation();
        if (!user) return;
        setActionModal({ isOpen: true, type: 'assign', ticketId });
    };

    const confirmAction = async () => {
        const { type, ticketId } = actionModal;
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'assign') {
                const userName = (user as any)?.nombre || (user as any)?.name || 'Usuario Actual';
                await patch(`/soporte/${ticketId}`, { asignado_a: userName, estado: 'Proceso', sub_estado: 'Proceso' });
                addNotification('success', `Ticket asignado a ${userName}`);
                const updated = tickets.map(t => t.id === ticketId ? { ...t, asignado_a: userName, estado: 'Proceso', sub_estado: 'Proceso' } : t);
                setTickets(updated);
            } else {
                await patch(`/soporte/${ticketId}`, { estado: 'Proceso', sub_estado: 'Proceso' });
                addNotification('success', 'Ticket actualizado a Proceso');
                const updated = tickets.map(t => t.id === ticketId ? { ...t, estado: 'Proceso', sub_estado: 'Proceso' } : t);
                setTickets(updated);
            }
        } catch (error) {
            console.error(error);
            addNotification('error', 'Error al actualizar el ticket');
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todos');
        setSubStatusFilter('Todos');
        setAnalystFilter('Todos');
        addNotification('info', 'Filtros restablecidos');
    };

    const hasActiveFilters = searchTerm !== '' || statusFilter !== 'Todos' || analystFilter !== 'Todos';

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
                        {(user?.role === 'analyst' || user?.role === 'admin_sistemas') && (
                            <div className="flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800">
                                <Icon name={UserCheck} size="xs" className="text-blue-500 mr-1" />
                                <Text variant="caption" weight="bold" className="text-blue-600 dark:text-blue-400">
                                    {user?.role === 'admin_sistemas' ? 'Vista Sistemas' : 'Mis asignaciones'}
                                </Text>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="relative w-64">
                        <Input
                            type="text"
                            placeholder="Buscar por ID, asunto, solicitante o área..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={Search}
                            className="bg-transparent border-none focus:ring-0"
                        />
                    </div>

                    <div className="w-48">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: "Todos", label: "Todos los estados" },
                                { value: "Pendiente", label: "Pendiente" },
                                { value: "Proceso", label: "Proceso" },
                                { value: "Cerrado", label: "Cerrado" },
                            ]}
                            className="bg-[var(--color-surface)]"
                        />
                    </div>

                    <div className="w-48">
                        <Select
                            value={analystFilter}
                            onChange={(e) => setAnalystFilter(e.target.value)}
                            options={[
                                { value: "Todos", label: "Todos los analistas" },
                                ...analystOptions
                            ]}
                            className="bg-[var(--color-surface)]"
                        />
                    </div>

                    {statusFilter !== 'Todos' && (
                        <div className="w-48 animate-in fade-in slide-in-from-left-2 duration-300">
                            <Select
                                value={subStatusFilter}
                                onChange={(e) => setSubStatusFilter(e.target.value)}
                                options={[
                                    { value: "Todos", label: `Todos (${statusFilter})` },
                                    ...SUB_STATUS_OPTIONS[statusFilter]
                                ]}
                                className="bg-[var(--color-surface)]"
                            />
                        </div>
                    )}

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            onClick={handleClearFilters}
                            icon={FilterX}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 shrink-0"
                            title="Limpiar filtros"
                        >
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tickets', count: statusCounts.total, color: 'blue', icon: Inbox },
                    { label: 'Pendientes', count: statusCounts.pendiente, color: 'blue', icon: AlertCircle },
                    { label: 'En Proceso', count: statusCounts.proceso, color: 'yellow', icon: RefreshCw },
                    { label: 'Cerrados', count: statusCounts.cerrado, color: 'green', icon: CheckCircle },
                ].map((card) => (
                    <div key={card.label} className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-border)] shadow-sm h-[100px]">
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
                <div className="relative">
                    {/* ENCABEZADO SINCRONIZADO (Flex Layout con anchos fijos solicitado) */}
                    <div className="hidden md:flex items-stretch gap-0 mb-3 bg-[var(--deep-navy)] rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden sticky top-0 z-20">
                        <div className={`${COLUMN_WIDTHS.id} shrink-0 flex items-center pl-6 py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">ID</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.fecha} shrink-0 flex items-center justify-center py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Fecha</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.area} shrink-0 flex items-center px-4 py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Área</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.solicitante} shrink-0 flex items-center px-6 py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Solicitante</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.asunto} min-w-0 flex items-center px-6 py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Asunto</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.prioridad} shrink-0 flex items-center justify-center py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Prioridad</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.estado} shrink-0 flex items-center justify-center py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Estado</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.analista} shrink-0 flex items-center px-4 py-2.5 border-r border-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Analista</Text>
                        </div>
                        <div className={`${COLUMN_WIDTHS.acciones} shrink-0 flex items-center justify-center py-2.5 bg-white/10`}>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">Acciones</Text>
                        </div>
                    </div>

                    <div className="max-h-[650px] overflow-y-auto pr-1 space-y-2 pb-6 custom-scrollbar">
                        {filteredTickets.map((ticket) => {
                            // Lógica de limpieza de ID para evitar #TKT-TKT-
                            const cleanId = ticket.id.replace('TKT-', '');

                            return (
                                <div
                                    key={ticket.id}
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    onMouseEnter={(e) => handleTicketMouseEnter(e, ticket)}
                                    onMouseLeave={handleTicketMouseLeave}
                                    className="group bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                >
                                    {/* Borde izquierdo azul navy fijo */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-900 dark:bg-blue-800"></div>

                                    <div className="flex flex-col md:flex-row md:items-center gap-0">
                                        {/* ID Col */}
                                        <div className={`${COLUMN_WIDTHS.id} shrink-0 pl-6 flex items-center`}>
                                            <Text variant="caption" className="font-mono text-[10px] text-gray-400">
                                                #TKT-{cleanId}
                                            </Text>
                                        </div>

                                        {/* Fecha Col */}
                                        <div className={`${COLUMN_WIDTHS.fecha} shrink-0 flex items-center justify-center text-gray-400`}>
                                            <Icon name={Clock} size="xs" className="mr-1.5" />
                                            <Text variant="caption" color="text-secondary" className="text-[10px]">
                                                {new Date(ticket.fecha_creacion).toLocaleDateString()}
                                            </Text>
                                        </div>

                                        {/* Área Col */}
                                        <div className={`${COLUMN_WIDTHS.area} shrink-0 flex items-center px-4`}>
                                            <Text variant="body2" weight="bold" className="truncate text-[11px] max-w-full" title={ticket.area_creador}>
                                                {ticket.area_creador || 'S/A'}
                                            </Text>
                                        </div>

                                        {/* Solicitante Col */}
                                        <div className={`${COLUMN_WIDTHS.solicitante} shrink-0 flex items-center text-gray-400 px-6`}>
                                            <Icon name={UserCheck} size="xs" className="w-3 h-3 mr-2" />
                                            <Text variant="caption" color="text-secondary" className="truncate text-[10px] uppercase">
                                                {ticket.nombre_creador}
                                            </Text>
                                        </div>

                                        {/* Asunto (Flex-1) */}
                                        <div className={`${COLUMN_WIDTHS.asunto} min-w-0 flex flex-col justify-center px-6`}>
                                            <Text variant="body2" weight="bold" color="text-primary" className="truncate group-hover:text-[var(--color-primary)] transition-colors text-sm">
                                                {ticket.asunto}
                                            </Text>
                                        </div>

                                        {/* Prioridad Col */}
                                        <div className={`${COLUMN_WIDTHS.prioridad} shrink-0 flex items-center justify-center gap-1.5`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${getPriorityStyle(ticket.prioridad).replace('text', 'bg')}`}></div>
                                            <Text variant="caption" weight="bold" className={`text-[10px] ${getPriorityStyle(ticket.prioridad)}`}>
                                                {ticket.prioridad}
                                            </Text>
                                        </div>

                                        {/* Estado Col */}
                                        <div className={`${COLUMN_WIDTHS.estado} shrink-0 flex items-center justify-center`}>
                                            <Text
                                                as="span"
                                                weight="bold"
                                                className={`px-3 py-1 rounded-lg text-[11px] tracking-wider border border-current/20 shrink-0 shadow-sm ${getStatusStyle(ticket.estado)}`}
                                            >
                                                {(ticket.estado || 'PENDIENTE').toUpperCase()}
                                            </Text>
                                        </div>

                                        {/* Analista Col */}
                                        <div className={`${COLUMN_WIDTHS.analista} shrink-0 flex items-center px-4 gap-2`}>
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${ticket.asignado_a ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-gray-100 text-gray-400'}`}>
                                                {ticket.asignado_a ? ticket.asignado_a.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <Text variant="caption" color="text-secondary" className="text-[10px] truncate" title={ticket.asignado_a}>
                                                {ticket.asignado_a ? formatName(ticket.asignado_a) : 'Sin asignar'}
                                            </Text>
                                        </div>

                                        {/* Acciones Col */}
                                        <div className={`flex items-center justify-center ${COLUMN_WIDTHS.acciones} gap-2`}>
                                            {(!ticket.asignado_a || (user && ticket.asignado_a !== (user as any).nombre)) && ticket.estado !== 'Cerrado' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => handleAssignToMe(e, ticket.id)}
                                                    className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                                                    title="Asignarme Ticket"
                                                    icon={UserPlus}
                                                />
                                            )}

                                            {ticket.estado !== 'Proceso' && ticket.estado !== 'Cerrado' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => handleQuickAction(e, ticket.id, 'Proceso', 'Proceso')}
                                                    className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                                                    title="Poner En Proceso"
                                                    icon={Play}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* BOTÓN CARGAR MÁS */}
                        {hasMore && (
                            <div className="py-8 flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={isLoadMoreLoading}
                                    className="min-w-[200px] border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all rounded-xl shadow-lg flex items-center gap-2"
                                >
                                    {isLoadMoreLoading ? (
                                        <Icon name={RefreshCw} size="sm" className="animate-spin" />
                                    ) : (
                                        <Icon name={RefreshCw} size="sm" />
                                    )}
                                    {isLoadMoreLoading ? 'Cargando...' : 'Cargar más tickets'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Tooltip flotante */}
                    {hoveredTicket && (
                        <TicketTooltip
                            ticket={hoveredTicket}
                            position={tooltipPos}
                            visible={tooltipVisible}
                        />
                    )}

                    {/* Modal de confirmación */}
                    <TicketActionModal
                        isOpen={actionModal.isOpen}
                        actionType={actionModal.type}
                        ticketId={actionModal.ticketId}
                        userName={(user as any)?.nombre || (user as any)?.name}
                        onConfirm={confirmAction}
                        onCancel={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                    />
                </div>
            ) : (
                <div className="py-20 text-center bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-xl shadow-black/5">
                    <div className="w-16 h-16 bg-[var(--color-background)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name={FilterX} size="lg" className="text-[var(--color-text-secondary)]/30" />
                    </div>
                    <Title variant="h6" weight="bold" className="mb-2" color="text-primary">No se encontraron tickets</Title>
                    <Text variant="body2" color="text-secondary" weight="medium">Prueba ajustando los filtros o el término de búsqueda.</Text>
                </div>
            )
            }
        </div >
    );
};

export default TicketManagement;
