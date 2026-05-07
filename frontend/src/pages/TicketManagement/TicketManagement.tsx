import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FilterX,
    UserCheck,
    RefreshCw
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
import TicketTable from './components/TicketTable';

import { useTicketManagement, Ticket } from './hooks/useTicketManagement';
import {
    SUB_STATUS_OPTIONS,
    STATS_CARDS
} from './constants';

const TicketManagement: React.FC = () => {
    const navigate = useNavigate();
    const {
        user,
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
        columnFilters,
        setColumnFilters,
        filteredTickets,
        columnOptions,
        dateRange,
        setDateRange,
        hasActiveFilters
    } = useTicketManagement();

    // Tooltip hover state
    const [hoveredTicket, setHoveredTicket] = useState<Ticket | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);

    const handleTicketMouseEnter = useCallback((ticket: Ticket, e: React.MouseEvent) => {
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
) : filteredTickets.length > 0 ? (
                <>
                    <TicketTable
                        tickets={filteredTickets}
                        user={user}
                        onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
                        onAssignMe={handleAssignToMe}
                        onQuickAction={handleQuickAction}
                        onMouseEnter={handleTicketMouseEnter}
                        onMouseLeave={handleTicketMouseLeave}
                        columnFilters={columnFilters}
                        columnOptions={Object.fromEntries(
                            (['id', 'fecha_creacion', 'hora', 'area_creador', 'nombre_creador', 'asunto', 'prioridad', 'estado', 'asignado_a'] as const)
                                .map(key => [key, columnOptions(key)])
                        )}
                        onFilterChange={(columnKey, filter) => {
                            if (typeof filter !== 'object' || !('size' in filter)) return;
                            setColumnFilters(prev => ({ ...prev, [columnKey]: filter as Set<string> }));
                        }}
                    />
                    
                    <div>
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
                </>
            ) : (
                <EmptyState />
            )}
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
