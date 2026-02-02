import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ExpenseLegalization from './ServicePortal/ExpenseLegalization';
import AreaSelectionView from './ServicePortal/AreaSelectionView';
import ViaticosManagement from './ServicePortal/ViaticosManagement';
import AccountStatement from './ServicePortal/AccountStatement';
import TransitReportsView from './ServicePortal/TransitReportsView';

import ThemeToggle from '../components/atoms/ThemeToggle';
import imgHardware from '../assets/images/categories/Soporte Hardware.png';
import imgSoftware from '../assets/images/categories/Soporte Software.png';
import imgPerifericos from '../assets/images/categories/Soporte Perifericos.png';
import imgImpresora from '../assets/images/categories/Soporte Impresora.png';
import imgMejora from '../assets/images/categories/Soporte Mejoramiento.png';
import imgDesarrollo from '../assets/images/categories/Nuevos desarrollos.png';
import imgLicencias from '../assets/images/categories/Compra de Licencias.png';
import imgControlCambios from '../assets/images/categories/Control de Cambios.png';

const API_BASE_URL = API_CONFIG.BASE_URL;

const ServicePortal: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const { user } = state;
    const { addNotification } = useNotifications();

    const NAV_CACHE_KEY = 'portal_nav_cache';

    // Recuperar estado inicial de localStorage
    const savedNav = JSON.parse(localStorage.getItem(NAV_CACHE_KEY) || '{}');

    const [view, setView] = useState<'dashboard' | 'areas' | 'categories' | 'form' | 'status' | 'success' | 'detail' | 'legalizar_gastos' | 'viaticos_reportes' | 'viaticos_gestion' | 'viaticos_estado'>(savedNav.view || 'dashboard');
    const [selectedArea, setSelectedArea] = useState<'sistemas' | 'desarrollo' | 'mejoramiento' | null>(savedNav.selectedArea || null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<any>(savedNav.selectedCategory || null);
    const [selectedTicket, setSelectedTicket] = useState<any>(savedNav.selectedTicket || null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newTicketId, setNewTicketId] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    // Persistir estado de navegación
    useEffect(() => {
        const navState = {
            view,
            selectedArea,
            selectedCategory,
            selectedTicket
        };
        localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(navState));
    }, [view, selectedArea, selectedCategory, selectedTicket]);

    // Metadatos visuales: Mapeamos el ID de la categoría con su icono y sección
    const categoryMetadata: Record<string, { icon: React.ReactNode; section: 'soporte' | 'mejoramiento' }> = {
        soporte_hardware: {
            icon: <img src={imgHardware} alt="Hardware" className="w-full h-full object-contain p-1" />,
            section: 'soporte'
        },
        soporte_software: {
            icon: <img src={imgSoftware} alt="Software" className="w-full h-full object-contain p-1" />,
            section: 'soporte'
        },
        soporte_impresoras: {
            icon: <img src={imgImpresora} alt="Impresoras" className="w-full h-full object-contain p-1" />,
            section: 'soporte'
        },
        perifericos: {
            icon: <img src={imgPerifericos} alt="Periféricos" className="w-full h-full object-contain p-1" />,
            section: 'soporte'
        },
        compra_licencias: {
            icon: <img src={imgLicencias} alt="Licencias" className="w-full h-full object-contain p-1" />,
            section: 'soporte'
        },
        nuevos_desarrollos_mejora: {
            icon: <img src={imgDesarrollo} alt="Desarrollos" className="w-full h-full object-contain p-1" />,
            section: 'mejoramiento'
        },
        control_cambios: {
            icon: <img src={imgControlCambios} alt="Control de Cambios" className="w-full h-full object-contain p-1" />,
            section: 'mejoramiento'
        },
        soporte_mejora: {
            icon: <img src={imgMejora} alt="Mejoramiento" className="w-full h-full object-contain p-1" />,
            section: 'mejoramiento'
        }
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/soporte/categorias`);
                const apiCats = res.data;

                // Mapeamos los datos de la API inyectando los iconos locales
                const mappedCategories = apiCats.map((apiCat: any) => {
                    const metadata = categoryMetadata[apiCat.id];
                    return {
                        id: apiCat.id,
                        name: apiCat.nombre,
                        description: apiCat.descripcion,
                        form_type: apiCat.tipo_formulario,
                        section: metadata ? metadata.section : 'soporte',
                        icon: metadata ? metadata.icon : <Plus />
                    };
                });

                setCategories(mappedCategories);
            } catch (err) {
                console.error("Error fetching categories:", err);
                // Si falla la API, podrías poner un estado de error o cargar unos mínimos
                addNotification('error', "Error al cargar el catálogo de servicios.");
            }
        };
        fetchCategories();
    }, []);

    // Efecto para asegurar que el perfil del usuario tenga área/cargo/sede (Auto-sync para sesiones activas)
    useEffect(() => {
        const refreshUserProfile = async () => {
            // Se dispara si falta área O sede
            if (user && (!user.area || !user.sede)) {
                const token = localStorage.getItem('token');
                if (!token) return;

                try {
                    const res = await axios.get(`${API_BASE_URL}/auth/yo`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data) {
                        const updatedUser = {
                            ...res.data,
                            id: res.data.id || res.data.cedula,
                            cedula: res.data.cedula || res.data.id,
                            name: res.data.nombre || res.data.name,
                            role: res.data.rol || res.data.role,
                            area: res.data.area,
                            cargo: res.data.cargo,
                            sede: res.data.sede
                        };
                        dispatch({ type: 'LOGIN', payload: updatedUser });
                    }
                } catch (err) {
                    console.error("No se pudo refrescar el perfil automáticamente:", err);
                }
            }
        };
        refreshUserProfile();
    }, [user, dispatch]);

    // Login logic removed

    const fetchTickets = async (id: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/soporte/mis-tickets/${id}`); // [CONTROLADO]
            setTickets(res.data);
        } catch (err) {
            console.error("Error fetching user tickets:", err);
            addNotification('error', "No se pudieron cargar tus tickets.");
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!selectedCategory || !user) return;
        setIsLoading(true);
        const fd = new FormData(e.currentTarget);

        const fileToBase64 = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = error => reject(error);
            });
        };

        try {
            let descripcionFinal = fd.get('descripcion_detallada') || 'Sin descripción';
            let queNecesitaFinal = fd.get('que_necesita') || null;
            let asuntoFinal = fd.get('asunto') || selectedCategory.name;

            if (selectedCategory.form_type === 'development') {
                const nombreProceso = fd.get('nombre_proceso');
                asuntoFinal = nombreProceso ? `Desarrollo: ${nombreProceso}` : selectedCategory.name;

                // Empaquetar el formulario de 6 secciones en un formato legible para el backend
                const seccion1 = `=== 1. IDENTIFICACIÓN ===\nProceso: ${nombreProceso}\nÁrea: ${fd.get('area_solicitante')}\nLíder: ${fd.get('lider_requerimiento')}`;
                const seccion2 = `=== 2. DIAGNÓSTICO ===\nHerramienta Excel: ${fd.get('existe_herramienta')}\nRutas: ${fd.get('ruta_archivos')}\nLimitaciones: ${fd.get('limitaciones_actuales')}`;
                const seccion3 = `=== 3. DINÁMICA ===\nEvento: ${fd.get('evento_iniciador')}\nCampos: ${fd.get('campos_obligatorios')}\nValidaciones: ${fd.get('validaciones_seguridad')}`;
                const seccion4 = `=== 4. WORKFLOW ===\nCiclo: ${fd.get('ciclo_vida')}\nActores: ${fd.get('actores_permisos')}\nRechazos: ${fd.get('gestion_rechazos')}`;
                const seccion5 = `=== 5. REGLAS ===\nCálculos: ${fd.get('calculos_automaticos')}\nRestricciones: ${fd.get('reglas_restriccion')}\nInmutabilidad: ${fd.get('inmutabilidad')}`;
                const seccion6 = `=== 6. INTEGRACIÓN ===\nImpacto: ${fd.get('impacto_modulos')}\nNotificaciones: ${fd.get('notificaciones_docs')}\nKPIs: ${fd.get('reportabilidad')}`;

                descripcionFinal = `${seccion1}\n\n${seccion2}\n\n${seccion3}`;
                queNecesitaFinal = `${seccion4}\n\n${seccion5}\n\n${seccion6}`;
            } else if (selectedCategory.section === 'mejoramiento') {
                const necesidad = fd.get('necesidad_especifica');
                asuntoFinal = necesidad ? `Mejora: ${necesidad.toString().substring(0, 40)}...` : `Mejora: ${selectedCategory.name}`;
            } else if (selectedCategory.section === 'soporte') {
                const situacion = fd.get('situacion_presentada');
                asuntoFinal = situacion ? `Soporte: ${situacion}` : `Soporte: ${selectedCategory.name}`;
            }

            if (selectedCategory.form_type === 'change_control') {
                asuntoFinal = fd.get('asunto') as string;
                descripcionFinal = fd.get('descripcion_cambio') as string;
            }

            // Consolidador de datos para el backend
            const formDataObj: Record<string, any> = {};
            fd.forEach((value, key) => {
                if (key !== 'archivos_adjuntos') {
                    formDataObj[key] = value;
                }
            });

            const payload: any = {
                categoria_id: selectedCategory.id,
                asunto: asuntoFinal,
                descripcion: descripcionFinal,
                creador_id: user.cedula || user.id,
                nombre_creador: user.name,
                correo_creador: user.email,
                area_creador: user.area,
                cargo_creador: user.cargo,
                sede_creador: user.sede,
                prioridad: (fd.get('nivel_prioridad') || 'Media') as string,
                areas_impactadas: fd.get('areas_impactadas') ? JSON.parse(fd.get('areas_impactadas') as string) : [],
                que_necesita: queNecesitaFinal,
                datos_extra: formDataObj, // Guardamos TODO el formulario aquí por si acaso

                // Campos específicos mapeados para compatibilidad
                item_solicitado: fd.get('hardware_solicitado') || fd.get('item_solicitado') || (selectedCategory.id === 'compra_licencias' ? 'LICENCIA DE SOFTWARE' : null),
                especificaciones: fd.get('especificaciones') || null,
                cantidad: parseInt(fd.get('cantidad') as string) || 1,
                fecha_entrega_ideal: fd.get('fecha_ideal') || null
            };

            // Validación de Áreas Impactadas
            if (['development', 'change_control'].includes(selectedCategory.form_type)) {
                if (!payload.areas_impactadas || payload.areas_impactadas.length === 0) {
                    addNotification('warning', "Debe agregar al menos una área impactada.");
                    setIsLoading(false);
                    return;
                }
            }

            if (user) {
                const res = await axios.post(`${API_BASE_URL}/soporte/`, payload); // [CONTROLADO]
                const createdTicketId = res.data.id;

                // 2. Subir adjuntos si existen
                if (selectedFiles.length > 0) {
                    for (const file of selectedFiles) {
                        try {
                            const base64 = await fileToBase64(file);
                            await axios.post(`${API_BASE_URL}/soporte/${createdTicketId}/adjuntos`, { // [CONTROLADO]
                                ticket_id: createdTicketId,
                                nombre_archivo: file.name,
                                contenido_base64: base64,
                                tipo_mime: file.type
                            });
                        } catch (fileErr) {
                            console.error(`Error subiendo archivo ${file.name}:`, fileErr);
                        }
                    }
                }

                setNewTicketId(createdTicketId);
                setView('success');
                fetchTickets(user.cedula || user.id);
                setSelectedFiles([]); // Limpiar archivos
            }
        } catch { addNotification('error', "Error al enviar ticket"); } finally { setIsLoading(false); }
    };

    const handleSendUserFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedTicket || !user) return;

        setIsLoading(true);
        const fd = new FormData(e.currentTarget);
        const userResponse = fd.get('user_response') as string;

        try {
            await axios.patch(`${API_BASE_URL}/soporte/${selectedTicket.id}`, { // [CONTROLADO]
                estado: 'En Proceso',
                notas: (selectedTicket.notes || '') + `\n\n[USER ${new Date().toLocaleString()}] ${userResponse}`
            });

            addNotification('success', "Información enviada correctamente. El ticket vuelve a estar en proceso.");

            // Actualizar lista y volver
            fetchTickets(user.cedula || user.id);
            setView('status');
        } catch (err) {
            console.error("Error enviando feedback:", err);
            addNotification('error', "No se pudo enviar la información.");
        } finally {
            setIsLoading(false);
        }
    };

    // Redirigir si no hay usuario (protección extra, aunque ProtectedRoute debería manejarlo)
    useEffect(() => {
        if (user && view === 'dashboard') {
            fetchTickets(user.cedula || user.id);
        }
    }, [user, view]);

    if (!user) return <div className="flex justify-center items-center h-screen">Cargando perfil...</div>;

    return (
        <div className="min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-text-primary)] transition-colors duration-300">
            <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-[1300px] mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('dashboard')}>
                        <div className="bg-[var(--color-primary)] p-2 rounded-xl text-[var(--color-background)] transition-colors"><Plus size={20} /></div>
                        <Text as="span" weight="bold" className="text-lg sm:text-xl tracking-tight text-[var(--color-primary)]">
                            <Text as="span" className="hidden sm:inline">Portal de Servicios SOLID</Text>
                            <Text as="span" className="inline sm:hidden">Portal SOLID</Text>
                        </Text>
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
                                localStorage.removeItem(NAV_CACHE_KEY);
                                dispatch({ type: 'LOGOUT' });
                                navigate('/login');
                            }}
                            className="p-2.5 rounded-xl hover:bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)] transition-colors"
                        >
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>
            </header>
            <main className="max-w-[1300px] mx-auto p-4 sm:px-8 sm:py-2">
                {view === 'dashboard' && <DashboardView user={user} onNavigate={(v: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado') => {
                    if (v === 'viaticos_gestion' || v === 'viaticos_estado') {
                        setView(v);
                    } else {
                        setView(v === 'categories' ? 'areas' : 'status');
                    }
                }} />}

                {view === 'areas' && (
                    <AreaSelectionView
                        onSelectArea={(area) => {
                            setSelectedArea(area);
                            // Si es desarrollo o mejoramiento y solo hay una categoría principal, podríamos ir directo al form
                            // Pero por ahora, filtramos y mostramos CategoryView por consistencia
                            setView('categories');
                        }}
                        onBack={() => setView('dashboard')}
                    />
                )}

                {view === 'categories' && (
                    <CategoryView
                        categories={categories.filter(c => {
                            if (selectedArea === 'sistemas') return c.section === 'soporte';
                            if (selectedArea === 'mejoramiento') return c.section === 'mejoramiento' && !['nuevos_desarrollos_mejora', 'control_cambios'].includes(c.id);
                            if (selectedArea === 'desarrollo') return ['nuevos_desarrollos_mejora', 'control_cambios'].includes(c.id);
                            return true;
                        })}
                        onSelect={(c) => { setSelectedCategory(c); setView('form'); }}
                        onBack={() => setView('areas')}
                    />
                )}

                {view === 'form' && selectedCategory && (
                    <TicketFormView
                        selectedCategory={selectedCategory}
                        user={user}
                        onSubmit={handleSubmit}
                        onBack={() => { setView('categories'); setSelectedFiles([]); }}
                        isLoading={isLoading}
                        selectedFiles={selectedFiles}
                        onFilesChange={setSelectedFiles}
                    />
                )}
                {view === 'status' && <TicketListView tickets={tickets} onBack={() => setView('dashboard')} onViewDetail={(t) => { setSelectedTicket(t); setView('detail'); }} />}
                {view === 'detail' && selectedTicket && <TicketDetailView selectedTicket={selectedTicket} user={user} onBack={() => setView('status')} onUpdate={handleSendUserFeedback} />}
                {view === 'legalizar_gastos' && (
                    <ExpenseLegalization
                        user={user}
                        onBack={() => setView('viaticos_gestion')}
                        onSuccess={() => { setView('viaticos_gestion'); addNotification('success', 'Reporte enviado a tránsito correctamente.'); }}
                    />
                )}
                {view === 'viaticos_gestion' && (
                    <ViaticosManagement
                        onNavigate={(v) => setView(v)}
                        onBack={() => setView('dashboard')}
                    />
                )}
                {view === 'viaticos_reportes' && (
                    <TransitReportsView
                        user={user}
                        onBack={() => setView('viaticos_gestion')}
                    />
                )}
                {view === 'viaticos_estado' && (
                    <AccountStatement
                        user={user}
                        onBack={() => setView('viaticos_gestion')}
                    />
                )}
                {view === 'success' && <SuccessView newTicketId={newTicketId} onHome={() => setView('dashboard')} />}
            </main>
        </div>
    );
};

export default ServicePortal;
