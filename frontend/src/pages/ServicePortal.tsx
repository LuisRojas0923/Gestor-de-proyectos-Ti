import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Wrench,
    Settings,
    Keyboard,
    ShieldCheck,
    Code,
    Plus,
    ClipboardList,
    ArrowLeft,
    LogOut,
    CheckCircle2,
    FileText,
    Clock,
    User,
    MapPin,
    Briefcase,
    Mail,
    Search,
    ChevronRight,
    Info
} from 'lucide-react';
import { API_CONFIG } from '../config/api';

// ====================================================================
// 1. INTERFACES Y CONFIGURACIÓN
// ====================================================================

const API_BASE_URL = API_CONFIG.BASE_URL;

type TicketStatus = 'Abierto' | 'En Proceso' | 'Cerrado' | 'Pendiente Info' | 'Escalado';

interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    form_type: 'support' | 'development' | 'asset';
}

interface Ticket {
    id: string;
    category_id: string;
    subject: string;
    status: TicketStatus;
    creation_date: string;
    creator_id: string;
    assigned_to?: string;
    diagnostic?: string;
    resolution?: string;
    time_spent_hours?: number;
    notes?: string;
    close_date?: string;
}

interface UserData {
    id: string;
    name: string;
    email: string;
    area: string;
    cargo: string;
    sede: string;
}

// ====================================================================
// 2. COMPONENTES REUTILIZABLES
// ====================================================================

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
    const styles = {
        'Abierto': 'bg-blue-100 text-blue-800 border-blue-200',
        'En Proceso': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Cerrado': 'bg-green-100 text-green-800 border-green-200',
        'Pendiente Info': 'bg-red-100 text-red-800 border-red-200',
        'Escalado': 'bg-purple-100 text-purple-800 border-purple-200'
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
            {status}
        </span>
    );
};

const FormField: React.FC<{
    label: string,
    name: string,
    type?: string,
    isRequired?: boolean,
    placeholder?: string,
    defaultValue?: string | number,
    readOnly?: boolean,
    icon?: React.ReactNode
}> = ({ label, name, type = 'text', isRequired = true, placeholder, defaultValue, readOnly = false, icon }) => (
    <div className="space-y-1.5">
        <label htmlFor={name} className="flex items-center text-sm font-semibold text-gray-700">
            {icon && <span className="mr-2 text-gray-400">{icon}</span>}
            {label} {isRequired && !readOnly && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
            type={type}
            id={name}
            name={name}
            placeholder={placeholder}
            defaultValue={defaultValue}
            readOnly={readOnly}
            required={isRequired && !readOnly}
            className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none
                ${readOnly ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 shadow-sm hover:border-gray-400'}`}
        />
    </div>
);

const TextAreaField: React.FC<{
    label: string,
    name: string,
    rows?: number,
    isRequired?: boolean,
    placeholder?: string,
    defaultValue?: string,
    readOnly?: boolean
}> = ({ label, name, rows = 3, isRequired = true, placeholder, defaultValue, readOnly = false }) => (
    <div className="space-y-1.5">
        <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
            {label} {isRequired && !readOnly && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
            id={name}
            name={name}
            rows={rows}
            placeholder={placeholder}
            defaultValue={defaultValue}
            readOnly={readOnly}
            required={isRequired && !readOnly}
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none
                ${readOnly ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 shadow-sm hover:border-gray-400'}`}
        />
    </div>
);

// ====================================================================
// 3. PÁGINA PRINCIPAL
// ====================================================================

const ServicePortal: React.FC = () => {
    const [view, setView] = useState<'login' | 'dashboard' | 'categories' | 'form' | 'status' | 'success'>('login');
    const [user, setUser] = useState<UserData | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newTicketId, setNewTicketId] = useState<string | null>(null);

    // Cargar categorías al inicio
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/soporte/categorias`);
                // Mapear iconos string a componentes Lucide
                const mapped = response.data.map((cat: Category) => ({
                    ...cat,
                    icon: getIconForCategory(cat.id)
                }));
                setCategories(mapped);
            } catch (err) {
                console.error("Error cargando categorías:", err);
                // Fallback hardcoded si falla el API
                setCategories([
                    { id: 'soporte_hardware', name: 'Soporte de Hardware', icon: <Wrench />, description: 'Problemas físicos.', form_type: 'support' },
                    { id: 'soporte_software', name: 'Soporte de Software', icon: <Settings />, description: 'Instalaciones y errores.', form_type: 'support' },
                    { id: 'perifericos', name: 'Periféricos', icon: <Keyboard />, description: 'Mouses, teclados, etc.', form_type: 'asset' },
                    { id: 'soporte_mejora', name: 'Mantenimiento Mejoramiento', icon: <ShieldCheck />, description: 'Ajustes desarrollos.', form_type: 'support' },
                    { id: 'nuevos_desarrollos_mejora', name: 'Nuevos Desarrollos', icon: <Code />, description: 'Nuevas soluciones.', form_type: 'development' }
                ]);
            }
        };
        fetchCategories();
    }, []);

    const getIconForCategory = (id: string) => {
        switch (id) {
            case 'soporte_hardware': return <Wrench className="w-8 h-8" />;
            case 'soporte_software': return <Settings className="w-8 h-8" />;
            case 'perifericos': return <Keyboard className="w-8 h-8" />;
            case 'soporte_mejora': return <ShieldCheck className="w-8 h-8" />;
            case 'nuevos_desarrollos_mejora': return <Code className="w-8 h-8" />;
            default: return <Plus className="w-8 h-8" />;
        }
    };

    // --- Acciones ---

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const cedula = formData.get('cedula') as string;

        if (cedula.length < 5) {
            setError("Número de identificación inválido");
            return;
        }

        // Simulación de login (esto debería venir de Auth)
        const mockUser: UserData = {
            id: cedula,
            name: cedula === '1107068093' ? 'Luis Rojas' : 'Colaborador Invitado',
            email: 'usuario@empresa.com',
            area: 'Tecnología',
            cargo: 'Analista',
            sede: 'Sede Principal'
        };

        setUser(mockUser);
        setView('dashboard');
        fetchUserTickets(cedula);
    };

    const fetchUserTickets = async (cedula: string) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/soporte/my/${cedula}`);
            setTickets(response.data);
        } catch (err) {
            console.error("Error cargando tickets:", err);
        }
    };

    const handleSubmitTicket = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCategory || !user) return;

        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        // Estructura de datos para el API
        const ticketData = {
            category_id: selectedCategory.id,
            subject: formData.get('asunto') || `${selectedCategory.name} - ${user.name}`,
            description: formData.get('descripcion_detallada'),
            priority: formData.get('nivel_prioridad') || 'Media',
            creator_id: user.id,
            creator_name: user.name,
            creator_email: user.email,
            creator_area: user.area,
            creator_cargo: user.cargo,
            creator_sede: user.sede,
            extra_data: Object.fromEntries(formData.entries())
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/soporte/`, ticketData);
            setNewTicketId(response.data.id);
            setView('success');
            fetchUserTickets(user.id);
        } catch (err) {
            console.error("Error creando ticket:", err);
            setError("No se pudo enviar la solicitud. Intente nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Vistas ---

    if (view === 'login') return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 transform transition-all">
                <div className="text-center mb-10">
                    <div className="bg-blue-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                        <User className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">Portal de Servicios</h1>
                    <p className="text-gray-500 mt-2">Ingrese sus credenciales para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <FormField label="Número de Identificación" name="cedula" placeholder="Ej: 1107068093" type="password" icon={<User size={18} />} />
                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95">
                        Acceder
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('dashboard')}>
                        <div className="bg-blue-600 p-2 rounded-xl text-white">
                            <Plus size={20} />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Portal TI</span>
                    </div>
                    {user && (
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.area}</p>
                            </div>
                            <button onClick={() => setView('login')} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                                <LogOut size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 sm:p-8">
                {view === 'dashboard' && (
                    <div className="space-y-12 py-6">
                        <div className="text-center space-y-2">
                            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                ¿En qué podemos ayudarte hoy?
                            </h2>
                            <p className="text-gray-500 text-lg">Selecciona una de las opciones principales de gestión</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <button onClick={() => setView('categories')} className="group p-8 bg-white border border-gray-200 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 text-center space-y-4">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                                    <Plus size={40} />
                                </div>
                                <h3 className="text-2xl font-bold">Solicitar Servicio</h3>
                                <p className="text-gray-500">Crea un nuevo ticket de soporte, desarrollo o activos.</p>
                            </button>

                            <button onClick={() => setView('status')} className="group p-8 bg-white border border-gray-200 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-1 text-center space-y-4">
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                                    <ClipboardList size={40} />
                                </div>
                                <h3 className="text-2xl font-bold">Mis Solicitudes</h3>
                                <p className="text-gray-500">Consulta el estado y progreso de tus tickets activos.</p>
                            </button>
                        </div>
                    </div>
                )}

                {view === 'categories' && (
                    <div className="space-y-8 py-4">
                        <button onClick={() => setView('dashboard')} className="flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors">
                            <ArrowLeft size={20} className="mr-2" /> Volver al inicio
                        </button>
                        <h2 className="text-3xl font-bold">Catálogo de Servicios</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => { setSelectedCategory(cat); setView('form'); }}
                                    className="p-6 bg-white border border-gray-200 rounded-3xl text-left hover:border-blue-500 hover:shadow-lg transition-all group">
                                    <div className="text-blue-600 mb-4 bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                        {cat.icon}
                                    </div>
                                    <h4 className="font-bold text-lg mb-2">{cat.name}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2">{cat.description}</p>
                                    <div className="mt-4 flex items-center text-blue-600 font-bold text-sm">
                                        Seleccionar <ChevronRight size={16} className="ml-1" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'form' && selectedCategory && user && (
                    <div className="space-y-8 py-4">
                        <button onClick={() => setView('categories')} className="flex items-center text-blue-600 font-bold">
                            <ArrowLeft size={20} className="mr-2" /> Cambiar categoría
                        </button>

                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-900 p-8 text-white flex items-center justify-between">
                                <div>
                                    <p className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-1">Nueva Solicitud</p>
                                    <h2 className="text-3xl font-bold">{selectedCategory.name}</h2>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                                    {selectedCategory.icon}
                                </div>
                            </div>

                            <form onSubmit={handleSubmitTicket} className="p-8 space-y-10">
                                {/* Sección 1: Datos Personales */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 text-gray-400">
                                        <User size={18} />
                                        <h3 className="font-bold uppercase tracking-wider text-sm">Información del Solicitante</h3>
                                        <div className="flex-grow border-t border-gray-100"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField label="Nombre" name="nombre" defaultValue={user.name} readOnly icon={<User size={16} />} />
                                        <FormField label="Área" name="area" defaultValue={user.area} readOnly icon={<Briefcase size={16} />} />
                                        <FormField label="Sede" name="sede" defaultValue={user.sede} readOnly icon={<MapPin size={16} />} />
                                        <FormField label="Correo" name="email" defaultValue={user.email} readOnly icon={<Mail size={16} />} />
                                    </div>
                                </div>

                                {/* Sección 2: Detalle */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 text-gray-400">
                                        <FileText size={18} />
                                        <h3 className="font-bold uppercase tracking-wider text-sm">Detalles de la Petición</h3>
                                        <div className="flex-grow border-t border-gray-100"></div>
                                    </div>
                                    <FormField label="Asunto o Título Corto" name="asunto" placeholder="Ej: Falla en impresora oficina 201" />
                                    <TextAreaField label="Descripción de la Solicitud" name="descripcion_detallada" placeholder="Sea lo más específico posible..." rows={5} />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">Prioridad</label>
                                            <select name="nivel_prioridad" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                                                <option>Baja</option>
                                                <option selected>Media</option>
                                                <option>Alta</option>
                                                <option>Crítica</option>
                                            </select>
                                        </div>
                                        <FormField label="Fecha Ideal de Cierre" name="fecha_ideal" type="date" icon={<Clock size={16} />} />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex justify-end space-x-4">
                                    <button type="button" onClick={() => setView('categories')} className="px-8 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-3.5 rounded-2xl shadow-lg disabled:opacity-50 transition-all flex items-center">
                                        {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
                                        {!isLoading && <ChevronRight className="ml-2" size={18} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'status' && (
                    <div className="space-y-8 py-4">
                        <div className="flex items-center justify-between">
                            <button onClick={() => setView('dashboard')} className="flex items-center text-blue-600 font-bold">
                                <ArrowLeft size={20} className="mr-2" /> Ir al inicio
                            </button>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="text" placeholder="Buscar por ID o asunto..." className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-bold">Mis Solicitudes</h2>
                                <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-sm font-bold border border-blue-100">
                                    Total: {tickets.length}
                                </span>
                            </div>

                            {tickets.length > 0 ? (
                                <div className="grid gap-4">
                                    {tickets.map(ticket => (
                                        <div key={ticket.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1 flex-grow">
                                                <div className="flex items-center space-x-3">
                                                    <span className="font-mono text-xs text-gray-400 uppercase tracking-tighter">{ticket.id}</span>
                                                    <StatusBadge status={ticket.status} />
                                                </div>
                                                <h4 className="font-bold text-lg text-gray-800">{ticket.subject}</h4>
                                                <div className="flex items-center text-xs text-gray-400 space-x-4">
                                                    <span className="flex items-center"><Clock size={12} className="mr-1" /> {new Date(ticket.creation_date).toLocaleDateString()}</span>
                                                    <span className="flex items-center"><User size={12} className="mr-1" /> {ticket.assigned_to || 'Sin asignar'}</span>
                                                </div>
                                            </div>
                                            <button className="bg-gray-50 hover:bg-blue-50 text-blue-600 p-3 rounded-2xl transition-colors shrink-0">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-16 text-center space-y-4">
                                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                        <Info size={40} />
                                    </div>
                                    <p className="text-gray-500 font-medium">No tienes solicitudes registradas aún.</p>
                                    <button onClick={() => setView('categories')} className="text-blue-600 font-bold hover:underline">Crear mi primer ticket ahora</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div className="py-20 text-center space-y-8 max-w-lg mx-auto">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle2 size={50} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-extrabold text-gray-900">¡Solicitud Enviada!</h2>
                            <p className="text-gray-500 text-lg">Tu requerimiento ha sido registrado en nuestra base de datos con el siguiente identificador:</p>
                        </div>
                        <div className="bg-white border-2 border-green-200 rounded-3xl p-6 shadow-xl shadow-green-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ID Seguimiento</p>
                            <p className="text-3xl font-mono font-black text-green-700">{newTicketId}</p>
                        </div>
                        <p className="text-sm text-gray-400">Te hemos enviado un correo con los detalles y el enlace para seguimiento.</p>
                        <div className="pt-6">
                            <button onClick={() => setView('dashboard')} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-lg transition-all">
                                Volver al Panel Principal
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-gray-100 bg-white py-8">
                <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
                    © 2026 Sistema de Gestión de Solicitudes y Proyectos TI | Hecho con ❤️ para la eficiencia interna.
                </div>
            </footer>
        </div>
    );
};

export default ServicePortal;
