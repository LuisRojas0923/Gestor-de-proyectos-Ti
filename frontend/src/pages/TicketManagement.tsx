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
import { API_ENDPOINTS } from '../config/api';

interface Ticket {
    id: string;
    subject: string;
    status: string;
    priority: string;
    creator_name: string;
    creation_date: string;
    assigned_to?: string;
}

const TicketManagement: React.FC = () => {
    const { state } = useAppContext();
    const { darkMode } = state;
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
                const data = await get(API_ENDPOINTS.DEVELOPMENTS_BULK.includes('soporte') ? '/soporte/' : '/soporte/'); // Use /soporte/ endpoint
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
            result = result.filter(t =>
                t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.creator_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'Todos') {
            result = result.filter(t => t.status === statusFilter);
        }

        setFilteredTickets(result);
    }, [searchTerm, statusFilter, tickets]);

    const getStatusStyle = (status: string) => {
        switch (status) {
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
        abierto: filteredTickets.filter(t => t.status === 'Abierto').length,
        enProceso: filteredTickets.filter(t => t.status === 'En Proceso').length,
        cerrado: filteredTickets.filter(t => t.status === 'Cerrado').length,
    };

    return (
        <div className="space-y-8 pb-10 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                        Gestión de Tickets
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight">Administración de solicitudes de soporte técnico</p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className={`relative ${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-xl border ${darkMode ? 'border-neutral-700' : 'border-gray-200'} shadow-sm`}>
                        <input
                            type="text"
                            placeholder="Buscar por ID, asunto o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-transparent outline-none w-64 text-sm"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-4 py-2.5 rounded-xl border ${darkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200'} text-sm font-bold shadow-sm outline-none`}
                    >
                        <option value="Todos">Todos los estados</option>
                        <option value="Abierto">Abierto</option>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Pendiente Info">Pendiente Info</option>
                        <option value="Escalado">Escalado</option>
                        <option value="Cerrado">Cerrado</option>
                    </select>
                </div>
            </div>

            {/* Status Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tickets', count: statusCounts.total, color: 'blue', icon: Inbox },
                    { label: 'Abiertos', count: statusCounts.abierto, color: 'blue', icon: AlertCircle },
                    { label: 'En Proceso', count: statusCounts.enProceso, color: 'yellow', icon: RefreshCw },
                    { label: 'Cerrados', count: statusCounts.cerrado, color: 'green', icon: CheckCircle },
                ].map((card) => (
                    <div key={card.label} className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-100'} p-5 rounded-3xl border shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-xl bg-${card.color}-100 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
                                <card.icon size={20} />
                            </div>
                            <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{card.count}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Cargando tickets...</p>
                </div>
            ) : filteredTickets.length > 0 ? (
                <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-[2.5rem] overflow-hidden border ${darkMode ? 'border-neutral-700' : 'border-gray-100'} shadow-sm shadow-black/5`}>
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-50 bg-gray-50/50'}`}>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asunto / Solicitante</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Prioridad</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones Rápidas</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right"></th>
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
                                            <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-gray-900'} group-hover:text-blue-600 transition-colors mb-0.5`}>
                                                {ticket.subject}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">{ticket.creator_name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <div className={`w-2 h-2 rounded-full ${getPriorityStyle(ticket.priority).replace('text', 'bg')}`}></div>
                                            <span className={`text-xs font-black ${getPriorityStyle(ticket.priority)}`}>{ticket.priority}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider ${getStatusStyle(ticket.status)}`}>
                                            {ticket.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-neutral-700 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}
                                                title="Asignarme"
                                                onClick={(e) => { e.stopPropagation(); /* Logic to assign */ }}
                                            >
                                                <UserCheck size={16} />
                                            </button>
                                            <button
                                                className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-neutral-700 text-green-400' : 'hover:bg-green-50 text-green-600'}`}
                                                title="Cerrar Ticket"
                                                onClick={(e) => { e.stopPropagation(); /* Logic to close */ }}
                                            >
                                                <CheckCircle size={16} />
                                            </button>
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
                <div className={`py-20 text-center ${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-[2.5rem] border ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                    <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FilterX size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No se encontraron tickets</h3>
                    <p className="text-gray-500">Prueba ajustando los filtros o el término de búsqueda.</p>
                </div>
            )}
        </div>
    );
};

export default TicketManagement;
