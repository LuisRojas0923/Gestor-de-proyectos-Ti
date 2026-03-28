import { useState, useEffect } from 'react';
import axios, { AxiosProgressEvent } from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { usePlanillaManualPDF } from './usePlanillaManualPDF';

export interface InventoryConfig {
    ronda_activa: number;
    conteo_nombre?: string;
}

export interface ERP_Empleado {
    nombre: string;
    cargo?: string;
}

export const useInventarioAdmin = () => {
    const { addNotification } = useNotifications();
    const { handleGeneratePlanilla0 } = usePlanillaManualPDF({ addNotification });

    // Carga Masiva
    const [file, setFile] = useState<File | null>(null);
    const [conteoName, setConteoName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [limpiarPrevio, setLimpiarPrevio] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; created: number; errors: string[] } | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Asignaciones y Configuración
    const [rondaActiva, setRondaActiva] = useState(1);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [newAsig, setNewAsig] = useState({ 
        cedula: '', 
        nombre: '', 
        cargo: '', 
        cedula_companero: '',
        nombre_companero: '',
        bodega: '', 
        bloque: '', 
        estante: '', // Se guardará como string separado por comas: "1, 2, 3"
        nivel: '' 
    });
    const [isSearchingEmpleado, setIsSearchingEmpleado] = useState(false);
    const [asignaciones, setAsignaciones] = useState<any[]>([]);
    const [isSavingAsig, setIsSavingAsig] = useState(false);
    const [isUploadingTransito, setIsUploadingTransito] = useState(false);
    const [editingAsigId, setEditingAsigId] = useState<number | null>(null);
    
    // Estadísticas, Cobertura y Monitoreo
    const [stats, setStats] = useState({ 
        total: 0, 
        conciliados: 0, 
        erroneos: 0, 
        discrepantes: 0, 
        pendientes: 0, 
        pendientes_c1: 0,
        pendientes_c2: 0,
        pendientes_c3: 0,
        reconteo: 0, 
        porcentaje_avance: 0 
    });
    const [coverage, setCoverage] = useState<{
        cobertura: number, 
        total_ubicaciones_pendientes: number, 
        cubiertos: number, 
        faltantes: string[],
        desglose_bodega?: Record<string, { total: number, cubiertos: number, porcentaje: number }>
    }>({cobertura: 0, total_ubicaciones_pendientes: 0, cubiertos: 0, faltantes: []});
    const [inventoryList, setInventoryList] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    // Persistencia de Filtros y Navegación
    const STORAGE_KEY_FILTERS = 'inventario_admin_filters';
    const STORAGE_KEY_TAB = 'inventario_admin_tab';
    const STORAGE_KEY_COL_FILTERS = 'inventario_admin_col_filters';

    // Inicialización de filtros desde localStorage
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
        return saved ? JSON.parse(saved) : { bodega: '', estado: '', search: '' };
    });

    // Inicialización de filtros de columna desde localStorage
    const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_COL_FILTERS);
        return saved ? JSON.parse(saved) : {};
    });

    // Inicialización de pestaña activa desde localStorage
    const [activeTab, setActiveTab] = useState<'config' | 'monitor' | 'validation'>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_TAB);
        return (saved as any) || 'monitor';
    });

    // Sincronización de Filtros a LocalStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
    }, [filters]);

    // Sincronización de Filtros de Columna a LocalStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_COL_FILTERS, JSON.stringify(columnFilters));
    }, [columnFilters]);

    // Sincronización de Pestaña a LocalStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_TAB, activeTab);
    }, [activeTab]);

    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    useEffect(() => {
        fetchConfig();
        fetchStats();
        fetchInventoryList();
        fetchAsignaciones();
        fetchCoverage();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInventoryList();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    useEffect(() => {
        if (newAsig.cedula.length >= 6) {
            const timer = setTimeout(() => {
                buscarEmpleadoERP(newAsig.cedula, 'titular');
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [newAsig.cedula]);

    useEffect(() => {
        if (newAsig.cedula_companero && newAsig.cedula_companero.length >= 6) {
            const timer = setTimeout(() => {
                buscarEmpleadoERP(newAsig.cedula_companero, 'companero');
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [newAsig.cedula_companero]);

    const fetchConfig = async () => {
        try {
            const response = await axios.get<InventoryConfig>(`${API_CONFIG.BASE_URL}/inventario/config`, { headers });
            if (response.data) {
                setRondaActiva(response.data.ronda_activa);
                setConteoName(response.data.conteo_nombre || '');
            }
        } catch (error) {
            console.error("Error fetching inventory config", error);
        }
    };

    const handleUploadMaestra = async () => {
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conteo', conteoName || 'Anual_2026');
        formData.append('limpiar_previo', String(limpiarPrevio));

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/inventario/cargar-excel`, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    const progress = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
                    setUploadProgress(progress);
                }
            });
            const data = res.data as any;
            setUploadResult({ success: data.exito, created: data.creados, errors: data.errores || [] });
            if (data.exito) {
                fetchStats();
                fetchInventoryList();
                fetchCoverage();
            }
        } catch (error) {
            setUploadResult({ success: false, created: 0, errors: ["Error al subir archivo"] });
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const handleUploadTransito = async () => {
        if (!file) return;
        setIsUploadingTransito(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/inventario/cargar-transito`, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    const progress = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
                    setUploadProgress(progress);
                }
            });
            const data = res.data as any;
            setUploadResult({ success: data.exito, created: data.creados, errors: data.errores || [] });
            if (data.exito) {
                fetchStats();
                fetchInventoryList();
            }
        } catch (error) {
            setUploadResult({ success: false, created: 0, errors: ["Error de conexión o servidor"] });
        } finally {
            setIsUploadingTransito(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get<any>(`${API_CONFIG.BASE_URL}/inventario/stats`, { headers });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats", error);
        }
    };

    const fetchCoverage = async () => {
        try {
            const response = await axios.get<any>(`${API_CONFIG.BASE_URL}/inventario/cobertura-asignacion`, { headers });
            setCoverage(response.data);
        } catch (error) {
            console.error("Error fetching coverage", error);
        }
    }

    const fetchInventoryList = async () => {
        setIsLoadingData(true);
        try {
            const params = { 
                bodega: filters.bodega || undefined, 
                estado: filters.estado || undefined 
            };
            const response = await axios.get<any[]>(`${API_CONFIG.BASE_URL}/inventario/lista`, { headers, params });
            let data = response.data;
            if (filters.search) {
                const s = filters.search.toLowerCase();
                data = data.filter((item: any) => 
                    item.codigo.toLowerCase().includes(s) || 
                    item.descripcion.toLowerCase().includes(s)
                );
            }
            
            // Ordenamiento por ubicación (Bodega -> Bloque -> Estante -> Nivel)
            data.sort((a, b) => {
                const locA = `${a.bodega}-${a.bloque}-${a.estante}-${a.nivel || ''}`;
                const locB = `${b.bodega}-${b.bloque}-${b.estante}-${b.nivel || ''}`;
                return locA.localeCompare(locB, undefined, { numeric: true });
            });
            
            setInventoryList(data);
        } catch (error) {
            console.error("Error fetching inventory list", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const fetchAsignaciones = async () => {
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/inventario/asignaciones`, { headers });
            setAsignaciones(response.data as any[]);
            fetchCoverage();
        } catch (error) {
            console.error("Error fetching asignaciones", error);
        }
    };

    const handleSaveAsig = async () => {
        if (!newAsig.cedula || !newAsig.bodega || !newAsig.bloque) {
            alert("Completa al menos Cédula, Bodega y Bloque");
            return;
        }
        setIsSavingAsig(true);
        try {
            if (editingAsigId) {
                await axios.patch(`${API_CONFIG.BASE_URL}/inventario/asignar/${editingAsigId}`, newAsig, { headers });
                addNotification('success', "Asignación actualizada con éxito.");
                setEditingAsigId(null);
            } else {
                await axios.post(`${API_CONFIG.BASE_URL}/inventario/asignar`, newAsig, { headers });
                addNotification('success', "Personal asignado correctamente.");
            }
            setNewAsig({ cedula: '', nombre: '', cargo: '', cedula_companero: '', nombre_companero: '', bodega: '', bloque: '', estante: '', nivel: '' });
            fetchAsignaciones();
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Error en la operación de asignación";
            addNotification('error', msg);
        } finally {
            setIsSavingAsig(false);
        }
    };

    const handleEditAsig = (asig: any) => {
        setEditingAsigId(asig.id);
        setNewAsig({
            cedula: asig.cedula,
            nombre: asig.nombre,
            cargo: asig.cargo || '',
            cedula_companero: asig.cedula_companero || '',
            nombre_companero: asig.nombre_companero || '',
            bodega: asig.bodega,
            bloque: asig.bloque,
            estante: asig.estante || '',
            nivel: asig.nivel || ''
        });
    };

    const cancelEdit = () => {
        setEditingAsigId(null);
        setNewAsig({ cedula: '', nombre: '', cargo: '', cedula_companero: '', nombre_companero: '', bodega: '', bloque: '', estante: '', nivel: '' });
    };

    const handleDeleteAsig = async (id: number) => {
        if (!confirm("¿Eliminar esta asignación?")) return;
        try {
            await axios.delete(`${API_CONFIG.BASE_URL}/inventario/asignar/${id}`, { headers });
            fetchAsignaciones();
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    const buscarEmpleadoERP = async (cedula: string, tipo: 'titular' | 'companero') => {
        setIsSearchingEmpleado(true);
        try {
            const response = await axios.get<ERP_Empleado>(`${API_CONFIG.BASE_URL}/erp/empleado/${cedula}`, { headers });
            if (response.data) {
                if (tipo === 'titular') {
                    setNewAsig(prev => ({
                        ...prev,
                        nombre: response.data.nombre || '',
                        cargo: response.data.cargo || ''
                    }));
                } else {
                    setNewAsig(prev => ({
                        ...prev,
                        nombre_companero: response.data.nombre || ''
                    }));
                }
            }
        } catch (error) {
            console.warn("Empleado no encontrado o error en ERP");
        } finally {
            setIsSearchingEmpleado(false);
        }
    };

    const handleUpdateRonda = async (r: number) => {
        setIsUpdatingConfig(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/inventario/config`, {
                ronda_activa: r,
                conteo_nombre: conteoName
            }, { headers });
            setRondaActiva(r);
        } catch (error) {
            alert("Error al actualizar la ronda global");
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    // --- PREVENCIÓN DE DOBLE ASIGNACIÓN (Requerimiento v4.2) ---
    // Filtros dinámicos que ocultan lo ya asignado para evitar duplicidad.
    const getBodegaOptions = () => {
        const unique = Array.from(new Set(inventoryList.map(i => i.bodega))).filter(Boolean);
        unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return [{ value: '', label: 'Seleccionar Bodega' }, ...unique.map(b => ({ value: b, label: b }))];
    };

    const getBloqueOptions = (bodega: string) => {
        if (!bodega) return [{ value: '', label: 'Bodega requerida' }];
        const allBlocks = Array.from(new Set(inventoryList.filter(i => i.bodega === bodega).map(i => i.bloque))).filter(Boolean);
        allBlocks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const availableBlocks = allBlocks.filter(bl => {
            if (editingAsigId) return true; 
            const isFullyAssigned = asignaciones.some(asig => 
                asig.bodega === bodega && asig.bloque === bl && (!asig.estante || asig.estante.trim() === "")
            );
            return !isFullyAssigned;
        });
        return [{ value: '', label: 'Seleccionar Bloque' }, ...availableBlocks.map(b => ({ value: b, label: b }))];
    };

    const getEstanteOptions = (bodega: string, bloque: string) => {
        if (!bloque) return [{ value: '', label: 'Bloque requerido' }];
        const allEstantes = Array.from(new Set(inventoryList.filter(i => i.bodega === bodega && i.bloque === bloque).map(i => i.estante))).filter(Boolean);
        allEstantes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const availableEstantes = allEstantes.filter(est => {
            if (editingAsigId) return true;
            return !asignaciones.some(asig => 
                asig.bodega === bodega && asig.bloque === bloque && (asig.estante || "").split(',').map((s:string)=>s.trim()).includes(est)
            );
        });
        return [{ value: '', label: 'Seleccionar Estante' }, ...availableEstantes.map(e => ({ value: e, label: e }))];
    };

    const getNivelOptions = (bodega: string, bloque: string, estante: string) => {
        if (!estante) return [{ value: '', label: 'Estante requerido' }];
        const unique = Array.from(new Set(inventoryList.filter(i => i.bodega === bodega && i.bloque === bloque && i.estante === estante).map(i => i.nivel))).filter(Boolean);
        unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return [{ value: '', label: 'Seleccionar Nivel' }, ...unique.map(n => ({ value: n, label: n }))];
    };

    return {
        // State
        file, setFile,
        conteoName, setConteoName,
        isUploading,
        limpiarPrevio, setLimpiarPrevio,
        uploadResult, setUploadResult,
        rondaActiva,
        isUpdatingConfig,
        newAsig, setNewAsig,
        isSearchingEmpleado,
        asignaciones,
        isSavingAsig,
        isUploadingTransito,
        uploadProgress,
        stats,
        coverage,
        inventoryList,
        isLoadingData,
        filters, setFilters,
        columnFilters, setColumnFilters,
        activeTab, setActiveTab,
        editingAsigId,
        // Handlers
        handleUploadMaestra,
        handleUploadTransito,
        handleSaveAsig,
        handleDeleteAsig,
        handleEditAsig,
        cancelEdit,
        handleUpdateRonda,
        fetchStats,
        fetchInventoryList,
        handleGeneratePlanilla0,
        // Helpers
        getBodegaOptions,
        getBloqueOptions,
        getEstanteOptions,
        getNivelOptions
    };
};
