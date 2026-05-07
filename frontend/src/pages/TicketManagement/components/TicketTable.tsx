import React from 'react';
import { Text, Badge, Button, Icon } from '../../../components/atoms';
import { DataTable, DataTableColumn } from '../../../components/molecules/DataTable';
import { Clock, UserCheck, UserPlus, Play } from 'lucide-react';
import { Ticket } from '../hooks/useTicketManagement';
import { getPriorityVariant, getStatusVariant } from '../constants';

interface TicketTableProps {
    tickets: Ticket[];
    isLoading?: boolean;
    user: any;
    onRowClick?: (ticket: Ticket) => void;
    onAssignMe?: (e: React.MouseEvent, ticketId: string) => void;
    onQuickAction?: (e: React.MouseEvent, ticketId: string) => void;
    onMouseEnter?: (ticket: Ticket, e: React.MouseEvent) => void;
    onMouseLeave?: () => void;
    columnFilters: Record<string, Set<string>>;
    columnOptions: Record<string, string[]>;
    onFilterChange?: (columnKey: string, filter: Set<string>) => void;
}

const formatName = (name: string) => {
    if (!name) return 'Sin asignar';
    return name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const TicketTable: React.FC<TicketTableProps> = ({
    tickets,
    isLoading,
    user,
    onRowClick,
    onAssignMe,
    onQuickAction,
    onMouseEnter,
    onMouseLeave,
    columnFilters,
    columnOptions,
    onFilterChange,
}) => {
    const columns: DataTableColumn<Ticket>[] = [
        {
            key: 'id',
            label: 'ID',
            centered: true,
            filterable: true,
            render: (ticket) => (
                <Text variant="caption" weight="bold" className="font-mono text-gray-400 whitespace-nowrap">
                    #{ticket.id}
                </Text>
            ),
        },
        {
            key: 'fecha_creacion',
            label: 'Fecha',
            minWidth: '100px',
            centered: true,
            filterable: true,
            render: (ticket) => (
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Icon name={Clock} size="xs" />
                    <Text variant="caption" weight="bold" color="text-secondary">
                        {new Date(ticket.fecha_creacion).toLocaleDateString()}
                    </Text>
                </div>
            ),
        },
        {
            key: 'hora',
            label: 'Hora',
            minWidth: '70px',
            centered: true,
            filterable: true,
            render: (ticket) => (
                <Text variant="caption" weight="bold" color="text-secondary">
                    {new Date(ticket.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
            ),
        },
        {
            key: 'area_creador',
            label: 'Área',
            minWidth: '120px',
            filterable: true,
            render: (ticket) => (
                <Text variant="caption" weight="bold" className="truncate" title={ticket.area_creador}>
                    {ticket.area_creador || 'S/A'}
                </Text>
            ),
        },
        {
            key: 'nombre_creador',
            label: 'Solicitante',
            minWidth: '140px',
            filterable: true,
            render: (ticket) => (
                <div className="flex items-center gap-2 text-gray-400 min-w-0">
                    <Icon name={UserCheck} size="xs" className="shrink-0" />
                    <Text variant="caption" weight="bold" color="text-secondary" className="truncate uppercase">
                        {ticket.nombre_creador}
                    </Text>
                </div>
            ),
        },
        {
            key: 'asunto',
            label: 'Asunto',
            flex: true,
            minWidth: '200px',
            filterable: true,
            render: (ticket) => (
                <Text
                    variant="caption"
                    weight="bold"
                    color="text-primary"
                    className="truncate group-hover:text-[var(--color-primary)] transition-colors"
                >
                    {ticket.asunto}
                </Text>
            ),
        },
        {
            key: 'prioridad',
            label: 'Prioridad',
            centered: true,
            filterable: true,
            render: (ticket) => (
                <Badge variant={getPriorityVariant(ticket.prioridad)} size="sm">
                    {ticket.prioridad}
                </Badge>
            ),
        },
        {
            key: 'estado',
            label: 'Estado',
            centered: true,
            filterable: true,
            render: (ticket) => (
                <Badge variant={getStatusVariant(ticket.estado)} size="sm" className="uppercase tracking-wider">
                    {ticket.estado || 'PENDIENTE'}
                </Badge>
            ),
        },
        {
            key: 'asignado_a',
            label: 'Analista',
            minWidth: '140px',
            filterable: true,
            render: (ticket) => (
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${ticket.asignado_a ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-gray-100 text-gray-400'}`}>
                        {ticket.asignado_a ? ticket.asignado_a.charAt(0).toUpperCase() : '?'}
                    </div>
                    <Text variant="caption" weight="bold" color="text-secondary" className="truncate" title={ticket.asignado_a}>
                        {ticket.asignado_a ? formatName(ticket.asignado_a) : 'Sin asignar'}
                    </Text>
                </div>
            ),
        },
    ];

    const renderRowActions = (ticket: Ticket) => {
        const canAssign = !ticket.asignado_a || (user && ticket.asignado_a !== (user as any).nombre);
        const isClosed = ticket.estado === 'Cerrado';

        return (
            <>
                {canAssign && !isClosed && (
                    <Button
                        variant="custom"
                        onClick={(e) => { e.stopPropagation(); onAssignMe?.(e, ticket.id); }}
                        className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                    >
                        <Icon name={UserPlus} size={16} />
                    </Button>
                )}
                <Button
                    variant="custom"
                    onClick={(e) => { e.stopPropagation(); onQuickAction?.(e, ticket.id); }}
                    className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                >
                    <Icon name={Play} size={16} />
                </Button>
            </>
        );
    };

    return (
        <DataTable
            columns={columns}
            data={tickets}
            keyExtractor={(ticket) => ticket.id}
            onRowClick={onRowClick}
            renderRowActions={renderRowActions}
            actionsMinWidth="100px"
            onMouseEnterRow={onMouseEnter}
            onMouseLeaveRow={onMouseLeave}
            columnFilters={columnFilters}
            columnOptions={columnOptions}
            onFilterChange={onFilterChange}
            isLoading={isLoading}
            loadingMessage="Cargando tickets..."
            emptyMessage="No se encontraron tickets"
            maxHeight="max-h-[650px]"
        />
    );
};

export default TicketTable;
