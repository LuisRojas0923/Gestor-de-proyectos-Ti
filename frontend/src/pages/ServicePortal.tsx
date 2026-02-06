import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { useAppContext } from '../context/AppContext';
import axios from 'axios';
import {
    Plus
} from 'lucide-react';
import { API_CONFIG } from '../config/api';
import DashboardView from './ServicePortal/pages/DashboardView';
import CategoryView, { Category } from './ServicePortal/pages/CategoryView';
import TicketFormView from './ServicePortal/pages/TicketFormView';
import TicketListView from './ServicePortal/pages/TicketListView';
import TicketDetailView from './ServicePortal/pages/TicketDetailView';
import SuccessView from './ServicePortal/pages/SuccessView';
import ExpenseLegalization from './ServicePortal/pages/ExpenseLegalization';
import AreaSelectionView from './ServicePortal/pages/AreaSelectionView';
import ViaticosManagement from './ServicePortal/pages/ViaticosManagement';
import AccountStatement from './ServicePortal/pages/AccountStatement';
import TransitReportsView from './ServicePortal/pages/TransitReportsView';
import PortalLayout from './ServicePortal/PortalLayout';

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
    const location = useLocation();
    const { user } = state;
    const { addNotification } = useNotifications();


    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newTicketId, setNewTicketId] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);


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
            icon: <img src={imgDesarrollo} alt="Desarrollos" className="w-full h-full object-fill scale-x-150" />,
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

    // Efecto para asegurar que el perfil del usuario tenga área/cargo/sede/centrocosto (Auto-sync para sesiones activas)
    useEffect(() => {
        const refreshUserProfile = async () => {
            // Se dispara si falta área O sede O centrocosto
            if (user && (!user.area || !user.sede || !user.centrocosto || user.centrocosto === '---')) {
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
                            sede: res.data.sede,
                            centrocosto: res.data.centrocosto || res.data.centro_costo || ''
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
                navigate(`/service-portal/exito/${createdTicketId}`);
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
            navigate('/service-portal/mis-tickets');
        } catch (err) {
            console.error("Error enviando feedback:", err);
            addNotification('error', "No se pudo enviar la información.");
        } finally {
            setIsLoading(false);
        }
    };

    // Redirigir si no hay usuario (protección extra, aunque ProtectedRoute debería manejarlo)
    useEffect(() => {
        if (user) {
            fetchTickets(user.cedula || user.id);
        }
    }, [user]);

    const CategoryWrapper: React.FC<{
        categories: Category[],
        onSelect: (c: Category) => void,
        onBack: () => void
    }> = ({ categories, onSelect, onBack }) => {
        const { area } = useParams<{ area: string }>();

        const filteredCategories = categories.filter(c => {
            if (area === 'sistemas') return c.section === 'soporte';
            if (area === 'mejoramiento') return c.section === 'mejoramiento' && !['nuevos_desarrollos_mejora', 'control_cambios'].includes(c.id);
            if (area === 'desarrollo') return ['nuevos_desarrollos_mejora', 'control_cambios'].includes(c.id);
            return true;
        });

        return <CategoryView categories={filteredCategories} onSelect={onSelect} onBack={onBack} />;
    };

    const TicketFormWrapper = () => {
        const { categoryId } = useParams<{ categoryId: string }>();
        const category = selectedCategory || categories.find(c => c.id === categoryId);

        if (!category && categories.length > 0) {
            return <Navigate to="/service-portal/servicios" replace />;
        }

        if (categories.length === 0) {
            return <div className="p-20 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-primary)] rounded-full" role="status"></div></div>;
        }

        return (
            <TicketFormView
                selectedCategory={category}
                user={user as any}
                onSubmit={handleSubmit}
                onBack={() => { navigate(-1); setSelectedFiles([]); }}
                isLoading={isLoading}
                selectedFiles={selectedFiles}
                onFilesChange={setSelectedFiles}
            />
        );
    };

    const TicketDetailWrapper = () => {
        const { ticketId } = useParams<{ ticketId: string }>();
        const ticket = selectedTicket || tickets.find(t => t.id === ticketId);

        if (!ticket && tickets.length > 0) {
            return <Navigate to="/service-portal/mis-tickets" replace />;
        }

        if (tickets.length === 0) {
            return <div className="p-20 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-primary)] rounded-full" role="status"></div></div>;
        }

        return (
            <TicketDetailView
                selectedTicket={ticket}
                user={user as any}
                onBack={() => navigate('/service-portal/mis-tickets')}
                onUpdate={handleSendUserFeedback}
            />
        );
    };

    if (!user) return <div className="flex justify-center items-center h-screen">Cargando perfil...</div>;

    return (
        <PortalLayout
            user={user}
            onHome={() => navigate('/service-portal/inicio')}
            onLogout={() => {
                dispatch({ type: 'LOGOUT' });
                navigate('/login');
            }}
        >
            <Routes>
                <Route index element={<Navigate to="/service-portal/inicio" replace />} />

                <Route path="inicio" element={
                    <DashboardView
                        user={user}
                        onNavigate={(v) => {
                            if (v === 'viaticos_gestion') navigate('/service-portal/gastos/gestion');
                            else if (v === 'categories') navigate('/service-portal/servicios');
                            else if (v === 'status') navigate('/service-portal/mis-tickets');
                        }}
                    />
                } />

                <Route path="servicios" element={
                    <AreaSelectionView
                        onSelectArea={(area) => navigate(`/service-portal/servicios/${area}`)}
                        onConsultStatus={() => navigate('/service-portal/mis-tickets')}
                        onBack={() => navigate('/service-portal/inicio')}
                    />
                } />

                <Route path="servicios/:area" element={
                    <CategoryWrapper
                        categories={categories}
                        onSelect={(c) => { setSelectedCategory(c); navigate(`/service-portal/crear/${c.id}`); }}
                        onBack={() => navigate('/service-portal/servicios')}
                    />
                } />

                <Route path="crear/:categoryId" element={<TicketFormWrapper />} />

                <Route path="mis-tickets" element={
                    <TicketListView
                        tickets={tickets}
                        onBack={() => navigate('/service-portal/inicio')}
                        onViewDetail={(t) => { setSelectedTicket(t); navigate(`/service-portal/mis-tickets/${t.id}`); }}
                    />
                } />

                <Route path="mis-tickets/:ticketId" element={<TicketDetailWrapper />} />

                <Route path="gastos/gestion" element={
                    <ViaticosManagement
                        onNavigate={(v) => {
                            if (v === 'legalizar_gastos') navigate('/service-portal/gastos/nuevo');
                            else if (v === 'viaticos_reportes') navigate('/service-portal/gastos/reportes');
                            else if (v === 'viaticos_estado') navigate('/service-portal/gastos/estado');
                        }}
                        onBack={() => navigate('/service-portal/inicio')}
                    />
                } />

                <Route path="gastos/nuevo" element={
                    <ExpenseLegalization
                        user={user}
                        onBack={() => {
                            if (location.state?.from === 'reportes') {
                                navigate('/service-portal/gastos/reportes');
                            } else {
                                navigate('/service-portal/gastos/gestion');
                            }
                        }}
                        onSuccess={() => {
                            if (location.state?.from === 'reportes') {
                                navigate('/service-portal/gastos/reportes');
                                addNotification('success', 'Reporte actualizado correctamente.');
                            } else {
                                navigate('/service-portal/gastos/gestion');
                                addNotification('success', 'Reporte enviado a tránsito correctamente.');
                            }
                        }}
                    />
                } />

                <Route path="gastos/reportes" element={
                    <TransitReportsView
                        user={user}
                        onBack={() => navigate('/service-portal/gastos/gestion')}
                        onSelectReport={async (rid) => {
                            try {
                                setIsLoading(true);
                                const res = await axios.get(`${API_BASE_URL}/viaticos/reporte/${rid}/detalle`);
                                const lineasDetalle = res.data.map((l: any) => ({
                                    id: l.id || Math.random().toString(36).substring(7),
                                    categoria: l.categoria,
                                    fecha: l.fecha_gasto,
                                    ot: l.ot,
                                    cc: l.cc,
                                    scc: l.scc,
                                    valorConFactura: Number(l.valor_con_factura),
                                    valorSinFactura: Number(l.valor_sin_factura),
                                    observaciones: l.observaciones_linea,
                                    adjuntos: typeof l.adjuntos === 'string' ? JSON.parse(l.adjuntos) : (l.adjuntos || []),
                                    combinacionesCC: [] // Se cargarán al entrar si es necesario
                                }));

                                navigate('/service-portal/gastos/nuevo', {
                                    state: {
                                        lineas: lineasDetalle,
                                        observaciones: res.data[0]?.observaciones_gral,
                                        reporte_id: rid,
                                        from: 'reportes'
                                    }
                                });
                            } catch (err) {
                                console.error("Error cargando detalle:", err);
                                addNotification('error', "No se pudo cargar el detalle del reporte.");
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                    />
                } />

                <Route path="gastos/estado" element={
                    <AccountStatement
                        user={user}
                        onBack={() => navigate('/service-portal/gastos/gestion')}
                    />
                } />

                <Route path="exito/:ticketId" element={
                    <SuccessView newTicketId={newTicketId} onHome={() => navigate('/service-portal/inicio')} />
                } />

                <Route path="*" element={<Navigate to="/service-portal/inicio" replace />} />
            </Routes>
        </PortalLayout>
    );
};

export default ServicePortal;
