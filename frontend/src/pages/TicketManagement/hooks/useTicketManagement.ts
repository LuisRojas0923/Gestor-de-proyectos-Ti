import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

export interface Ticket {
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
    categoria_id: string;
    solicitud_activo?: {
        item_solicitado: string;
        cantidad: number;
        especificaciones?: string;
    };
    datos_extra?: Record<string, any>;
}

export const formatName = (name: string) => {
    if (!name) return "Sin asignar";
    return name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const useTicketManagement = () => {
    const { state } = useAppContext();
    const { user } = state;
    const { get, patch } = useApi<any>();
    const { addNotification } = useNotifications();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ticket_search') || '');
    const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('ticket_status') || 'Todos');
    const [subStatusFilter, setSubStatusFilter] = useState(() => localStorage.getItem('ticket_substatus') || 'Todos');
    const [analystFilter, setAnalystFilter] = useState(() => localStorage.getItem('ticket_analyst') || 'Todos');
    const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem('ticket_category') || 'Todos');

    // Nuevos filtros por columna (Client-side)
    const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>(() => {
        const saved = localStorage.getItem('ticket_column_filters');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const result: Record<string, Set<string>> = {};
                Object.keys(parsed).forEach(key => {
                    result[key] = new Set(parsed[key]);
                });
                return result;
            } catch (e) { return {}; }
        }
        return {};
    });

    const [dateRange, setDateRange] = useState<{ start: string, end: string }>(() => {
        const saved = localStorage.getItem('ticket_date_range');
        return saved ? JSON.parse(saved) : { start: '', end: '' };
    });

    const [analystOptions, setAnalystOptions] = useState<{ value: string, label: string }[]>([]);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 100;

    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'assign' | 'process';
        ticketId: string;
    }>({ isOpen: false, type: 'assign', ticketId: '' });

    const fetchAnalysts = useCallback(async () => {
        try {
            const data = await get('/soporte/estadisticas/rendimiento');
            if (data && Array.isArray(data)) {
                const options = data.map((a: any) => ({
                    value: a.name,
                    label: formatName(a.name)
                }));
                setAnalystOptions(options);
            }
        } catch (error) {
            console.error("Error cargando analistas:", error);
        }
    }, [get]);

    useEffect(() => {
        fetchAnalysts();
    }, [fetchAnalysts, state.refreshKey]);

    useEffect(() => {
        localStorage.setItem('ticket_search', searchTerm);
        localStorage.setItem('ticket_status', statusFilter);
        localStorage.setItem('ticket_substatus', subStatusFilter);
        localStorage.setItem('ticket_analyst', analystFilter);
        localStorage.setItem('ticket_category', categoryFilter);

        // Guardar filtros de columna
        const toSave: Record<string, string[]> = {};
        Object.keys(columnFilters).forEach(key => {
            toSave[key] = Array.from(columnFilters[key]);
        });
        localStorage.setItem('ticket_column_filters', JSON.stringify(toSave));
        localStorage.setItem('ticket_date_range', JSON.stringify(dateRange));
    }, [searchTerm, statusFilter, subStatusFilter, analystFilter, categoryFilter, columnFilters, dateRange]);

    const fetchTickets = useCallback(async (currentSkip: number, isNewSearch: boolean = false) => {
        try {
            if (isNewSearch) setIsLoading(true);
            else setIsLoadMoreLoading(true);

            const params = new URLSearchParams();
            params.append('skip', currentSkip.toString());
            params.append('limite', LIMIT.toString());
            if (statusFilter !== 'Todos') params.append('estado', statusFilter);
            if (subStatusFilter !== 'Todos') params.append('sub_estado', subStatusFilter);
            if (analystFilter !== 'Todos') params.append('asignado_a', analystFilter);
            if (categoryFilter !== 'Todos') params.append('categoria_id', categoryFilter);
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
    }, [get, statusFilter, subStatusFilter, analystFilter, categoryFilter, searchTerm, addNotification]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSkip(0);
            fetchTickets(0, true);
        }, 500);

        return () => clearTimeout(timer);
    }, [fetchTickets, state.refreshKey]);

    useEffect(() => {
        setSubStatusFilter('Todos');
    }, [statusFilter]);

    const handleLoadMore = () => {
        const nextSkip = skip + LIMIT;
        setSkip(nextSkip);
        fetchTickets(nextSkip);
    };

    const confirmAction = async () => {
        const { type, ticketId } = actionModal;
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'assign') {
                const userName = (user as any)?.nombre || (user as any)?.name || 'Usuario Actual';
                await patch(`/soporte/${ticketId}`, { asignado_a: userName, estado: 'Proceso', sub_estado: 'Proceso' });
                addNotification('success', `Ticket asignado a ${userName}`);
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, asignado_a: userName, estado: 'Proceso', sub_estado: 'Proceso' } : t));
            } else {
                await patch(`/soporte/${ticketId}`, { estado: 'Proceso', sub_estado: 'Proceso' });
                addNotification('success', 'Ticket actualizado a Proceso');
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, estado: 'Proceso', sub_estado: 'Proceso' } : t));
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
        setCategoryFilter('Todos');
        setColumnFilters({});
        setDateRange({ start: '', end: '' });
        addNotification('info', 'Filtros restablecidos');
    };

    // Valores únicos para los filtros de columna
    const columnOptions = useCallback((key: keyof Ticket | 'hora') => {
        if (key === 'hora') {
            const horas = tickets.map(t => new Date(t.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
            return [...new Set(horas)].sort();
        }
        const options = new Set<string>();
        tickets.forEach(t => {
            const val = t[key as keyof Ticket];
            if (key === 'fecha_creacion') {
                // Normalizar a YYYY-MM-DD para evitar duplicados por hora/segundo y desfases de zona horaria
                const dateStr = String(val).substring(0, 10);
                options.add(dateStr);
            } else {
                options.add(String(val || ''));
            }
        });
        return Array.from(options).sort().reverse();
    }, [tickets]);

    // Tickets filtrados por columna (Client-side)
    const filteredTickets = (tickets || []).filter(ticket => {
        // Filtro por Rango de Fecha
        if (dateRange.start || dateRange.end) {
            const ticketDateStr = ticket.fecha_creacion.substring(0, 10);
            if (dateRange.start && ticketDateStr < dateRange.start) return false;
            if (dateRange.end && ticketDateStr > dateRange.end) return false;
        }

        for (const [key, filterSet] of Object.entries(columnFilters)) {
            if (!filterSet || filterSet.size === 0) continue;

            if (key === 'hora') {
                const value = new Date(ticket.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                if (!filterSet.has(value)) return false;
            } else if (key === 'fecha_creacion') {
                const dateStr = ticket.fecha_creacion.substring(0, 10);
                if (!filterSet.has(dateStr)) return false;
            } else {
                const val = String(ticket[key as keyof Ticket] || '');
                if (!filterSet.has(val)) return false;
            }
        }
        return true;
    });

    const statusCounts = {
        total: filteredTickets.length,
        pendiente: filteredTickets.filter(t => t.estado === 'Pendiente').length,
        proceso: filteredTickets.filter(t => t.estado === 'Proceso').length,
        cerrado: filteredTickets.filter(t => t.estado === 'Cerrado').length,
    };

    return {
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
        columnFilters,
        setColumnFilters,
        filteredTickets,
        columnOptions,
        dateRange,
        setDateRange,
        hasActiveFilters: searchTerm !== '' || statusFilter !== 'Todos' || analystFilter !== 'Todos' || categoryFilter !== 'Todos' || Object.values(columnFilters).some(s => s.size > 0) || dateRange.start !== '' || dateRange.end !== ''
    };
};
