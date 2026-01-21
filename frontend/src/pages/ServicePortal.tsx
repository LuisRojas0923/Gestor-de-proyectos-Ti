import React, { useState, useEffect } from 'react';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { useAppContext } from '../context/AppContext';
import axios from 'axios';
import {
    Plus,
    LogOut
} from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { Button, Text } from '../components/atoms';
import DashboardView from './ServicePortal/DashboardView';
import CategoryView, { Category } from './ServicePortal/CategoryView';
import TicketFormView from './ServicePortal/TicketFormView';
import TicketListView from './ServicePortal/TicketListView';
import TicketDetailView from './ServicePortal/TicketDetailView';
import SuccessView from './ServicePortal/SuccessView';

import ThemeToggle from '../components/atoms/ThemeToggle';
import imgHardware from '../assets/images/categories/Soporte Hardware.png';
import imgSoftware from '../assets/images/categories/Soporte Software.png';
import imgPerifericos from '../assets/images/categories/Soporte Perifericos.png';
import imgImpresora from '../assets/images/categories/Soporte Impresora.png';
import imgMejora from '../assets/images/categories/Soporte Mejoramiento.png';
import imgDesarrollo from '../assets/images/categories/Nuevos desarrollos.png';
import imgLicencias from '../assets/images/categories/Compra de Licencias.png';

const API_BASE_URL = API_CONFIG.BASE_URL;

const ServicePortal: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { user } = state;
    const [view, setView] = useState<'dashboard' | 'categories' | 'form' | 'status' | 'success' | 'detail'>('dashboard');
    // const [user, setUser] = useState<any>(null); // Eliminado, usamos contexto
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newTicketId, setNewTicketId] = useState<string | null>(null);
    const { addNotification } = useNotifications();

    const defaultCategories: Category[] = [
        {
            id: 'soporte_hardware',
            name: 'Soporte de Hardware',
            icon: <img src={imgHardware} alt="Hardware" className="w-full h-full object-contain p-1" />,
            description: 'Problemas físicos: PC, laptop, impresora.',
            form_type: 'support'
        },
        {
            id: 'soporte_software',
            name: 'Soporte de Software',
            icon: <img src={imgSoftware} alt="Software" className="w-full h-full object-contain p-1" />,
            description: 'Instalaciones, desinstalaciones o errores de software.',
            form_type: 'support'
        },
        {
            id: 'soporte_impresoras',
            name: 'Soporte de Impresoras',
            icon: <img src={imgImpresora} alt="Impresoras" className="w-full h-full object-contain p-1" />,
            description: 'Configuración, atascos de papel, cambio de toner y mantenimiento.',
            form_type: 'support'
        },
        {
            id: 'perifericos',
            name: 'Periféricos y Equipos',
            icon: <img src={imgPerifericos} alt="Periféricos" className="w-full h-full object-contain p-1" />,
            description: 'Solicitud de mouse, teclado, monitor, toner.',
            form_type: 'asset'
        },
        {
            id: 'soporte_mejora',
            name: 'Soporte Mejoramiento',
            icon: <img src={imgMejora} alt="Mejoramiento" className="w-full h-full object-contain p-1" />,
            description: 'Ajustes a desarrollos existentes (Excel, Solid, aplicaciones internas).',
            form_type: 'support'
        },
        {
            id: 'nuevos_desarrollos_mejora',
            name: 'Nuevos Desarrollos',
            icon: <img src={imgDesarrollo} alt="Desarrollos" className="w-full h-full object-contain p-1" />,
            description: 'Creación de nuevos sistemas o automatización de procesos.',
            form_type: 'development'
        },
        {
            id: 'compra_licencias',
            name: 'Compra de Licencias',
            icon: <img src={imgLicencias} alt="Licencias" className="w-full h-full object-contain p-1" />,
            description: 'Solicitud de licencias de software y paquetería.',
            form_type: 'asset'
        }
    ];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/soporte/categorias`);
                const mapped = res.data.map((cat: any) => ({
                    id: cat.id,
                    name: cat.nombre || cat.name || '',
                    description: cat.descripcion || cat.description || '',
                    form_type: cat.tipo_formulario || cat.form_type || 'support',
                    icon: defaultCategories.find(d => d.id === cat.id)?.icon || <Plus />
                }));
                setCategories(mapped.length > 0 ? mapped : defaultCategories);
            } catch { setCategories(defaultCategories); }
        };
        fetchCategories();
    }, []);

    // Login logic removed

    const fetchTickets = async (id: string) => {
        try { const res = await axios.get(`${API_BASE_URL}/soporte/mis-tickets/${id}`); setTickets(res.data); } catch { }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!selectedCategory || !user) return;
        setIsLoading(true);
        const fd = new FormData(e.currentTarget);
        try {
            // Generate unique ticket ID: TKT-{timestamp}-{random}
            const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            let descripcionFinal = fd.get('descripcion_detallada') || 'Sin descripción';
            let queNecesitaFinal = fd.get('que_necesita') || null;
            let asuntoFinal = fd.get('asunto') || selectedCategory.name;

            if (selectedCategory.form_type === 'development') {
                const nombreProceso = fd.get('nombre_proceso');
                asuntoFinal = nombreProceso ? `Nuevo Desarrollo: ${nombreProceso}` : selectedCategory.name;

                // Empaquetar el formulario de 6 secciones en un formato legible para el backend
                const seccion1 = `=== 1. IDENTIFICACIÓN ===\nProceso: ${nombreProceso}\nÁrea: ${fd.get('area_solicitante')}\nLíder: ${fd.get('lider_requerimiento')}`;
                const seccion2 = `=== 2. DIAGNÓSTICO ===\nHerramienta Excel: ${fd.get('existe_herramienta')}\nRutas: ${fd.get('ruta_archivos')}\nLimitaciones: ${fd.get('limitaciones_actuales')}`;
                const seccion3 = `=== 3. DINÁMICA ===\nEvento: ${fd.get('evento_iniciador')}\nCampos: ${fd.get('campos_obligatorios')}\nValidaciones: ${fd.get('validaciones_seguridad')}`;
                const seccion4 = `=== 4. WORKFLOW ===\nCiclo: ${fd.get('ciclo_vida')}\nActores: ${fd.get('actores_permisos')}\nRechazos: ${fd.get('gestion_rechazos')}`;
                const seccion5 = `=== 5. REGLAS ===\nCálculos: ${fd.get('calculos_automaticos')}\nRestricciones: ${fd.get('reglas_restriccion')}\nInmutabilidad: ${fd.get('inmutabilidad')}`;
                const seccion6 = `=== 6. INTEGRACIÓN ===\nImpacto: ${fd.get('impacto_modulos')}\nNotificaciones: ${fd.get('notificaciones_docs')}\nKPIs: ${fd.get('reportabilidad')}`;

                descripcionFinal = `${seccion1}\n\n${seccion2}\n\n${seccion3}`;
                queNecesitaFinal = `${seccion4}\n\n${seccion5}\n\n${seccion6}`;
            }

            const payload: any = {
                id: ticketId,
                categoria_id: selectedCategory.id,
                asunto: asuntoFinal,
                descripcion: descripcionFinal,
                creador_id: user.id,
                nombre_creador: user.name,
                correo_creador: user.email,
                prioridad: 'Media',
                // Optional fields for development requests
                que_necesita: queNecesitaFinal,
                porque: fd.get('porque') || null,
                paraque: fd.get('paraque') || null,
                justificacion_ia: null
            };

            const res = await axios.post(`${API_BASE_URL}/soporte/`, payload);
            setNewTicketId(res.data.id); setView('success'); fetchTickets(user.id);
        } catch { addNotification('error', "Error al enviar ticket"); } finally { setIsLoading(false); }
    };

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        alert('Simulación: Ticket actualizado correctamente.');
        setView('status');
    };

    // Redirigir si no hay usuario (protección extra, aunque ProtectedRoute debería manejarlo)
    useEffect(() => {
        if (user && view === 'dashboard') {
            fetchTickets(user.id);
        }
    }, [user, view]);

    if (!user) return <div className="flex justify-center items-center h-screen">Cargando perfil...</div>;

    return (
        <div className="min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-text-primary)] transition-colors duration-300">
            <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('dashboard')}>
                        <div className="bg-[var(--color-primary)] p-2 rounded-xl text-[var(--color-background)] transition-colors"><Plus size={20} /></div>
                        <Text as="span" weight="bold" className="text-xl tracking-tight text-[var(--color-primary)]">Portal TI</Text>
                    </div>

                    <div className="flex items-center space-x-4">
                        <ThemeToggle />
                        <div className="text-right hidden sm:block border-l border-[var(--color-border)] pl-4">
                            <Text variant="body2" weight="bold" color="text-primary">{user.name}</Text>
                            <Text variant="caption" color="text-secondary">{user.area || 'Usuario'}</Text>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                dispatch({ type: 'LOGOUT' });
                                // Dejar que Route maneje redirect o recargar
                                // window.location.reload(); 
                            }}
                            className="p-2.5 rounded-xl hover:bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)] transition-colors"
                        >
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>
            </header>
            <main className="max-w-5xl mx-auto p-4 sm:p-8">
                {view === 'dashboard' && <DashboardView onNavigate={setView} />}
                {view === 'categories' && <CategoryView categories={categories} onSelect={(c) => { setSelectedCategory(c); setView('form'); }} onBack={() => setView('dashboard')} />}
                {view === 'form' && selectedCategory && <TicketFormView selectedCategory={selectedCategory} user={user} onSubmit={handleSubmit} onBack={() => setView('categories')} isLoading={isLoading} />}
                {view === 'status' && <TicketListView tickets={tickets} onBack={() => setView('dashboard')} onViewDetail={(t) => { setSelectedTicket(t); setView('detail'); }} />}
                {view === 'detail' && selectedTicket && <TicketDetailView selectedTicket={selectedTicket} user={user} onBack={() => setView('status')} onUpdate={handleUpdate} />}
                {view === 'success' && <SuccessView newTicketId={newTicketId} onHome={() => setView('dashboard')} />}
            </main>
        </div>
    );
};

export default ServicePortal;
