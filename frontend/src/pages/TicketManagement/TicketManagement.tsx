import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FilterX,
    UserCheck,
    RefreshCw,
    UserPlus,
    Play,
    Clock
} from 'lucide-react';

import {
    Button,
    Select,
    Input,
    Title,
    Text,
    Icon
} from '../../components/atoms';

import TicketTooltip from './TicketTooltip';
import TicketActionModal from './TicketActionModal';

import { useTicketManagement, formatName, Ticket } from './hooks/useTicketManagement';
import {
    COLUMN_WIDTHS,
    SUB_STATUS_OPTIONS,
    getStatusStyle,
    getPriorityStyle,
    STATS_CARDS
} from './constants';

const TicketManagement: React.FC = () => {
    const navigate = useNavigate();
    const {
        user,
        tickets,
        isLoading,
        isLoadMoreLoading,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        subStatusFilter,
        setSubStatusFilter,
        analystFilter,
        setAnalystFilter,
        categoryFilter,
        setCategoryFilter,
        analystOptions,
        hasMore,
        handleLoadMore,
        statusCounts,
        actionModal,
        setActionModal,
        confirmAction,
        handleClearFilters,
        hasActiveFilters
    } = useTicketManagement();

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

    const handleAssignToMe = (e: React.MouseEvent, ticketId: string) => {
        e.stopPropagation();
        if (!user) return;
        setActionModal({ isOpen: true, type: 'assign', ticketId });
    };

    const handleQuickAction = (e: React.MouseEvent, ticketId: string) => {
        e.stopPropagation();
        setActionModal({ isOpen: true, type: 'process', ticketId });
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
                    {/* Botones de Especialidad */}
                    <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm">
                        {['Todos', 'grupo_mejoramiento', 'grupo_ti'].map((cat) => (
                            <Button
                                key={cat}
                                variant={categoryFilter === cat ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setCategoryFilter(cat)}
                            >
                                {cat === 'Todos' ? 'Todos' : cat === 'grupo_mejoramiento' ? 'Mejoramiento' : 'TI'}
                            </Button>
                        ))}
                    </div>

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
                {STATS_CARDS(statusCounts).map((card) => (
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
            ) : tickets.length > 0 ? (
                <div className="relative">
                    <div className="hidden md:flex items-stretch gap-0 mb-3 bg-[var(--deep-navy)] rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden sticky top-0 z-20">
                        <HeaderCell width={COLUMN_WIDTHS.id} label="ID" className="pl-6" />
                        <HeaderCell width={COLUMN_WIDTHS.fecha} label="Fecha" centered />
                        <HeaderCell width={COLUMN_WIDTHS.area} label="Área" />
                        <HeaderCell width={COLUMN_WIDTHS.solicitante} label="Solicitante" className="px-6" />
                        <HeaderCell width={COLUMN_WIDTHS.asunto} label="Asunto" className="px-6" />
                        <HeaderCell width={COLUMN_WIDTHS.prioridad} label="Prioridad" centered />
                        <HeaderCell width={COLUMN_WIDTHS.estado} label="Estado" centered />
                        <HeaderCell width={COLUMN_WIDTHS.analista} label="Analista" />
                        <HeaderCell width={COLUMN_WIDTHS.acciones} label="Acciones" centered last />
                    </div>

                    <div className="max-h-[650px] overflow-y-auto pr-1 space-y-2 pb-6 custom-scrollbar">
                        {tickets.map((ticket) => (
                            <TicketRow
                                key={ticket.id}
                                ticket={ticket}
                                user={user}
                                navigate={navigate}
                                onMouseEnter={handleTicketMouseEnter}
                                onMouseLeave={handleTicketMouseLeave}
                                onAssignMe={handleAssignToMe}
                                onQuickAction={handleQuickAction}
                            />
                        ))}

                        {hasMore && (
                            <div className="py-8 flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={isLoadMoreLoading}
                                    className="min-w-[200px] border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all rounded-xl shadow-lg flex items-center gap-2"
                                >
                                    <Icon name={RefreshCw} size="sm" className={isLoadMoreLoading ? 'animate-spin' : ''} />
                                    {isLoadMoreLoading ? 'Cargando...' : 'Cargar más tickets'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {hoveredTicket && (
                        <TicketTooltip
                            ticket={hoveredTicket}
                            position={tooltipPos}
                            visible={tooltipVisible}
                        />
                    )}

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
                <EmptyState />
            )}
        </div>
    );
};

const HeaderCell: React.FC<{ width: string, label: string, centered?: boolean, className?: string, last?: boolean }> = ({ width, label, centered, className = "px-4", last }) => (
    <div className={`${width} shrink-0 flex items-center ${centered ? 'justify-center' : ''} py-2.5 ${!last ? 'border-r border-white/10' : 'bg-white/10'} ${className}`}>
        <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white">{label}</Text>
    </div>
);

const TicketRow: React.FC<{
    ticket: Ticket,
    user: any,
    navigate: any,
    onMouseEnter: any,
    onMouseLeave: any,
    onAssignMe: any,
    onQuickAction: any
}> = ({ ticket, user, navigate, onMouseEnter, onMouseLeave, onAssignMe, onQuickAction }) => {
    const cleanId = ticket.id.replace('TKT-', '');

    return (
        <div
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            onMouseEnter={(e) => onMouseEnter(e, ticket)}
            onMouseLeave={onMouseLeave}
            className="group bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-900 dark:bg-blue-800"></div>
            <div className="flex flex-col md:flex-row md:items-center gap-0">
                <div className={`${COLUMN_WIDTHS.id} shrink-0 pl-6 flex items-center`}>
                    <Text variant="caption" className="font-mono text-[10px] text-gray-400">#TKT-{cleanId}</Text>
                </div>

                <div className={`${COLUMN_WIDTHS.fecha} shrink-0 flex items-center justify-center text-gray-400`}>
                    <Icon name={Clock} size="xs" className="mr-1.5" />
                    <Text variant="caption" color="text-secondary" className="text-[10px]">
                        {new Date(ticket.fecha_creacion).toLocaleDateString()}
                    </Text>
                </div>

                <div className={`${COLUMN_WIDTHS.area} shrink-0 flex items-center px-4`}>
                    <Text variant="body2" weight="bold" className="truncate text-[11px] max-w-full" title={ticket.area_creador}>
                        {ticket.area_creador || 'S/A'}
                    </Text>
                </div>

                <div className={`${COLUMN_WIDTHS.solicitante} shrink-0 flex items-center text-gray-400 px-6`}>
                    <Icon name={UserCheck} size="xs" className="w-3 h-3 mr-2" />
                    <Text variant="caption" color="text-secondary" className="truncate text-[10px] uppercase">{ticket.nombre_creador}</Text>
                </div>

                <div className={`${COLUMN_WIDTHS.asunto} min-w-0 flex flex-col justify-center px-6`}>
                    <Text variant="body2" weight="bold" color="text-primary" className="truncate group-hover:text-[var(--color-primary)] transition-colors text-sm">
                        {ticket.asunto}
                    </Text>
                </div>

                <div className={`${COLUMN_WIDTHS.prioridad} shrink-0 flex items-center justify-center gap-1.5`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityStyle(ticket.prioridad).replace('text', 'bg')}`}></div>
                    <Text variant="caption" weight="bold" className={`text-[10px] ${getPriorityStyle(ticket.prioridad)}`}>
                        {ticket.prioridad}
                    </Text>
                </div>

                <div className={`${COLUMN_WIDTHS.estado} shrink-0 flex items-center justify-center`}>
                    <Text as="span" weight="bold" className={`px-3 py-1 rounded-lg text-[11px] tracking-wider border border-current/20 shrink-0 shadow-sm ${getStatusStyle(ticket.estado)}`}>
                        {(ticket.estado || 'PENDIENTE').toUpperCase()}
                    </Text>
                </div>

                <div className={`${COLUMN_WIDTHS.analista} shrink-0 flex items-center px-4 gap-2`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${ticket.asignado_a ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-gray-100 text-gray-400'}`}>
                        {ticket.asignado_a ? ticket.asignado_a.charAt(0).toUpperCase() : '?'}
                    </div>
                    <Text variant="caption" color="text-secondary" className="text-[10px] truncate" title={ticket.asignado_a}>
                        {ticket.asignado_a ? formatName(ticket.asignado_a) : 'Sin asignar'}
                    </Text>
                </div>

                <div className={`flex items-center justify-center ${COLUMN_WIDTHS.acciones} gap-2`}>
                    {(!ticket.asignado_a || (user && ticket.asignado_a !== (user as any).nombre)) && ticket.estado !== 'Cerrado' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => onAssignMe(e, ticket.id)}
                            className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                            icon={UserPlus}
                        />
                    )}

                    {ticket.estado !== 'Proceso' && ticket.estado !== 'Cerrado' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => onQuickAction(e, ticket.id)}
                            className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                            icon={Play}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const EmptyState: React.FC = () => (
    <div className="py-20 text-center bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-xl shadow-black/5">
        <div className="w-16 h-16 bg-[var(--color-background)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name={FilterX} size="lg" className="text-[var(--color-text-secondary)]/30" />
        </div>
        <Title variant="h6" weight="bold" className="mb-2" color="text-primary">No se encontraron tickets</Title>
        <Text variant="body2" color="text-secondary" weight="medium">Prueba ajustando los filtros o el término de búsqueda.</Text>
    </div>
);

export default TicketManagement;
