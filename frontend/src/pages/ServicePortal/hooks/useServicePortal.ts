import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useAppContext } from '../../../context/AppContext';
import { API_CONFIG } from '../../../config/api';
import { Category } from '../pages/CategoryView';
import { getCategoryIcon, getCategorySection } from '../portalMetadata';

const API_BASE_URL = API_CONFIG.BASE_URL;

export const useServicePortal = () => {
    const { state, dispatch } = useAppContext();
    const { user } = state;
    const { addNotification } = useNotifications();

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newTicketId, setNewTicketId] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const hasRefreshed = useRef(false);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/soporte/categorias`);
            const apiCats = res.data as any[];

            const mappedCategories = apiCats.map((apiCat: any) => ({
                id: apiCat.id,
                name: apiCat.nombre,
                description: apiCat.descripcion,
                form_type: apiCat.tipo_formulario,
                section: getCategorySection(apiCat.id),
                icon: getCategoryIcon(apiCat.id)
            }));

            setCategories(mappedCategories);
        } catch (err) {
            console.error("Error fetching categories:", err);
            addNotification('error', "Error al cargar el catálogo de servicios.");
        }
    }, [addNotification]);

    const fetchTickets = useCallback(async (id: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/soporte/mis-tickets/${id}`);
            setTickets(res.data as any[]);
        } catch (err) {
            console.error("Error fetching user tickets:", err);
            addNotification('error', "No se pudieron cargar tus tickets.");
        }
    }, [addNotification]);

    const refreshUserProfile = useCallback(async () => {
        if (user && !hasRefreshed.current && (!user.area || !user.sede || !user.centrocosto || user.centrocosto === '---')) {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                hasRefreshed.current = true;
                const res = await axios.get(`${API_BASE_URL}/auth/yo`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data) {
                    const data = res.data as any;
                    const updatedUser = {
                        ...user,
                        id: data.id || data.cedula || user?.id || '',
                        cedula: data.cedula || data.id || user?.cedula || '',
                        name: data.nombre || data.name || user?.name || '',
                        role: data.rol || data.role || user?.role || 'usuario',
                        email: data.email || user?.email || '',
                        area: data.area || user?.area || 'Sin Área',
                        cargo: data.cargo || user?.cargo || 'Sin Cargo',
                        sede: data.sede || user?.sede || 'Principal',
                        centrocosto: data.centrocosto || data.centro_costo || user?.centrocosto || '---',
                        viaticante: data.viaticante ?? user?.viaticante ?? false,
                        permissions: data.permissions || data.permisos || user?.permissions || []
                    };

                    if (updatedUser.area !== user.area || updatedUser.sede !== user.sede) {
                        dispatch({ type: 'LOGIN', payload: updatedUser });
                    }
                }
            } catch (err) {
                console.error("No se pudo refrescar el perfil automáticamente:", err);
            }
        }
    }, [user, dispatch]);

    useEffect(() => {
        fetchCategories();
        refreshUserProfile();
    }, [fetchCategories, refreshUserProfile]);

    useEffect(() => {
        if (user?.cedula || user?.id) {
            fetchTickets(user.cedula || user.id);
        }
    }, [user?.cedula, user?.id, fetchTickets]);

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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCategory || !user) return;
        setIsLoading(true);
        const fd = new FormData(e.currentTarget);

        try {
            let descripcionFinal = fd.get('descripcion_detallada') || 'Sin descripción';
            let queNecesitaFinal = fd.get('que_necesita') || null;
            let asuntoFinal = fd.get('asunto') || selectedCategory.name;
            let finalCategoryId = selectedCategory.id;

            if (selectedCategory.id === 'soporte_tecnico_sistemas' || selectedCategory.id === 'soporte_tecnico') {
                const subCatId = fd.get('sub_categoria_id');
                if (subCatId) {
                    finalCategoryId = subCatId.toString();
                    if (!fd.get('asunto')) {
                        const allSubCats = categories.find(c => c.id === selectedCategory.id)?.subCategories || [];
                        const subCatName = allSubCats.find((sc: any) => sc.id === subCatId)?.name;
                        asuntoFinal = subCatName ? `${subCatName}: ${fd.get('situacion_presentada') || 'Solicitud'}` : asuntoFinal;
                    }
                }
            }

            if (selectedCategory.form_type === 'development') {
                const nombreProceso = fd.get('nombre_proceso');
                asuntoFinal = nombreProceso ? `Desarrollo: ${nombreProceso}` : selectedCategory.name;

                const seccion1 = `=== 1. IDENTIFICACIÓN ===\nProceso: ${nombreProceso}\nUsuarios Estimados: ${fd.get('cantidad_usuarios_estimada')}\nÁrea: ${fd.get('area_solicitante')}\nLíder: ${fd.get('lider_requerimiento')}`;
                const seccion2 = `=== 2. DIAGNÓSTICO ===\nHerramienta Excel: ${fd.get('existe_herramienta')}\nVolumen Datos: ${fd.get('volumen_datos_estimado')}\nRutas: ${fd.get('ruta_archivos')}\nLimitaciones: ${fd.get('limitaciones_actuales')}`;
                const seccion3 = `=== 3. DATOS DE ENTRADA ===\nEvento: ${fd.get('evento_iniciador')}\nCampos: ${fd.get('campos_obligatorios')}\nValidaciones: ${fd.get('validaciones_seguridad')}`;
                const seccion4 = `=== 4. FLUJO DE TRABAJO ===\nCiclo: ${fd.get('ciclo_vida')}\nActores: ${fd.get('actores_permisos')}\nRechazos: ${fd.get('gestion_rechazos')}`;
                const seccion5 = `=== 5. REGLAS ===\nCálculos: ${fd.get('calculos_automaticos')}\nRestricciones: ${fd.get('reglas_restriccion')}\nInmutabilidad: ${fd.get('inmutabilidad')}`;
                const seccion6 = `=== 6. INTEGRACIÓN Y ÉXITO ===\nImpacto: ${fd.get('impacto_modulos')}\nNotificaciones: ${fd.get('notificaciones_docs')}\nKPIs: ${fd.get('reportabilidad')}\nCriterio de Éxito: ${fd.get('criterio_exito')}`;

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

            const formDataObj: Record<string, any> = {};
            fd.forEach((value, key) => {
                if (key !== 'archivos_adjuntos') formDataObj[key] = value;
            });

            const payload: any = {
                categoria_id: finalCategoryId,
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
                datos_extra: formDataObj,
                item_solicitado: fd.get('hardware_solicitado') || fd.get('item_solicitado') || (selectedCategory.id === 'compra_licencias' ? 'LICENCIA DE SOFTWARE' : null),
                especificaciones: fd.get('especificaciones') || null,
                cantidad: parseInt(fd.get('cantidad') as string) || 1,
                fecha_entrega_ideal: fd.get('fecha_ideal') || null
            };

            if (['development', 'change_control'].includes(selectedCategory.form_type)) {
                if (!payload.areas_impactadas || payload.areas_impactadas.length === 0) {
                    addNotification('warning', "Debe agregar al menos una área impactada.");
                    setIsLoading(false);
                    return null;
                }
            }

            const res = await axios.post(`${API_BASE_URL}/soporte/`, payload);
            const createdTicketId = (res.data as any).id;

            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    try {
                        const base64 = await fileToBase64(file);
                        await axios.post(`${API_BASE_URL}/soporte/${createdTicketId}/adjuntos`, {
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
            fetchTickets(user.cedula || user.id);
            setSelectedFiles([]);
            return createdTicketId;
        } catch (err) {
            console.error("Error submitting ticket:", err);
            addNotification('error', "Error al enviar ticket");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendUserFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedTicket || !user) return;

        setIsLoading(true);
        const fd = new FormData(e.currentTarget);
        const userResponse = fd.get('user_response') as string;

        try {
            await axios.patch(`${API_BASE_URL}/soporte/${selectedTicket.id}`, {
                estado: 'En Proceso',
                notas: (selectedTicket.notes || '') + `\n\n[USER ${new Date().toLocaleString()}] ${userResponse}`
            });

            addNotification('success', "Información enviada correctamente. El ticket vuelve a estar en proceso.");
            fetchTickets(user.cedula || user.id);
            return true;
        } catch (err) {
            console.error("Error enviando feedback:", err);
            addNotification('error', "No se pudo enviar la información.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        user,
        dispatch,
        categories,
        selectedCategory,
        setSelectedCategory,
        selectedTicket,
        setSelectedTicket,
        tickets,
        isLoading,
        setIsLoading,
        newTicketId,
        selectedFiles,
        setSelectedFiles,
        handleSubmit,
        handleSendUserFeedback,
        fetchTickets
    };
};
