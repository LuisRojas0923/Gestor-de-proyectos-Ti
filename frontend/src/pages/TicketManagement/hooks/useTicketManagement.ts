import { useState, useEffect, useCallback, useRef } from 'react';
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
    }, [fetchAnalysts]);

    useEffect(() => {
        localStorage.setItem('ticket_search', searchTerm);
        localStorage.setItem('ticket_status', statusFilter);
        localStorage.setItem('ticket_substatus', subStatusFilter);
        localStorage.setItem('ticket_analyst', analystFilter);
        localStorage.setItem('ticket_category', categoryFilter);
    }, [searchTerm, statusFilter, subStatusFilter, analystFilter, categoryFilter]);

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
    }, [fetchTickets]);

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
        addNotification('info', 'Filtros restablecidos');
    };

    const statusCounts = {
        total: tickets.length,
        pendiente: tickets.filter(t => t.estado === 'Pendiente').length,
        proceso: tickets.filter(t => t.estado === 'Proceso').length,
        cerrado: tickets.filter(t => t.estado === 'Cerrado').length,
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
        hasActiveFilters: searchTerm !== '' || statusFilter !== 'Todos' || analystFilter !== 'Todos' || categoryFilter !== 'Todos'
    };
};
