import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosProgressEvent } from 'axios';
import * as XLSX from 'xlsx';
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
        bodega: ''
    });
    const [isSearchingEmpleado, setIsSearchingEmpleado] = useState(false);
    const [asignaciones, setAsignaciones] = useState<any[]>([]);
    const [asignacionesResumen, setAsignacionesResumen] = useState<any[]>([]);
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
        desglose_bodega?: Record<string, { 
            total: number, 
            cubiertos: number, 
            porcentaje: number,
            hechos_c1: number,
            p_c1: number,
            hechos_c2: number,
            p_c2: number,
            parejas: number,
            items_por_pareja: number,
            discrepancias: number
        }>
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
        fetchAsignacionesResumen();
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

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get<any>(`${API_CONFIG.BASE_URL}/inventario/stats`, { headers });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats", error);
        }
    }, [headers]);

    const fetchCoverage = useCallback(async () => {
        try {
            const response = await axios.get<any>(`${API_CONFIG.BASE_URL}/inventario/cobertura-asignacion`, { headers });
            setCoverage(response.data);
        } catch (error) {
            console.error("Error fetching coverage", error);
        }
    }, [headers]);

    const fetchInventoryList = useCallback(async () => {
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
            
            // Ordenamiento natural por ubicación (Bodega -> Bloque -> Estante -> Nivel)
            data.sort((a, b) => {
                if (a.bodega !== b.bodega) return a.bodega.localeCompare(b.bodega, undefined, { numeric: true });
                if (a.bloque !== b.bloque) return a.bloque.localeCompare(b.bloque, undefined, { numeric: true });
                if (a.estante !== b.estante) return a.estante.localeCompare(b.estante, undefined, { numeric: true });
                if (a.nivel !== b.nivel) return (a.nivel || '').localeCompare(b.nivel || '', undefined, { numeric: true });
                return (a.codigo || '').localeCompare(b.codigo || '');
            });
            
            setInventoryList(data);
        } catch (error) {
            console.error("Error fetching inventory list", error);
        } finally {
            setIsLoadingData(false);
        }
    }, [headers, filters]);

    const fetchAsignaciones = useCallback(async () => {
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/inventario/asignaciones`, { headers });
            setAsignaciones(response.data as any[]);
            fetchCoverage();
        } catch (error) {
            console.error("Error fetching asignaciones", error);
        }
    }, [headers, fetchCoverage]);

    const fetchAsignacionesResumen = useCallback(async () => {
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/inventario/asignaciones/resumen`, { headers });
            setAsignacionesResumen(response.data as any[]);
        } catch (error) {
            console.error("Error fetching asignaciones resumen", error);
        }
    }, [headers]);

    const handleSaveAsig = async () => {
        if (!newAsig.cedula || !newAsig.bodega) {
            alert("Selecciona al menos el Personal y la Bodega");
            return;
        }
        setIsSavingAsig(true);

        const asigPayload = {
            ...newAsig,
            bloque: '',
            estante: '',
            nivel: ''
        };

        try {
            if (editingAsigId) {
                await axios.patch(`${API_CONFIG.BASE_URL}/inventario/asignar/${editingAsigId}`, asigPayload, { headers });
                addNotification('success', "Asignación actualizada con éxito.");
                setEditingAsigId(null);
            } else {
                await axios.post(`${API_CONFIG.BASE_URL}/inventario/asignar`, asigPayload, { headers });
                addNotification('success', "Personal asignado correctamente.");
            }
            setNewAsig({ cedula: '', nombre: '', cargo: '', cedula_companero: '', nombre_companero: '', bodega: '' });
            fetchAsignaciones();
            fetchAsignacionesResumen();
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Error en la operación de asignación";
            addNotification('error', msg);
        } finally {
            setIsSavingAsig(false);
        }
    };

    const handleBulkSaveAsignaciones = async (parejas: any[]) => {
        setIsSavingAsig(true);
        try {
            // Una sola asignación por pareja: solo bodega
            const bulkAsignaciones = parejas.map(p => ({
                cedula: p.titular.cc,
                nombre: p.titular.nombre,
                cedula_companero: p.companero ? p.companero.cc : null,
                nombre_companero: p.companero ? p.companero.nombre : null,
                bodega: p.bodega,
                bloque: '',
                estante: '',
                nivel: ''
            }));
            
            if (bulkAsignaciones.length === 0) {
                addNotification('warning', 'No hay asignaciones válidas para guardar.');
                return;
            }

            addNotification('info', `Guardando ${bulkAsignaciones.length} asignaciones...`);
            let failCount = 0;
            for (const asigData of bulkAsignaciones) {
                try {
                    await axios.post(`${API_CONFIG.BASE_URL}/inventario/asignar`, asigData, { headers });
                } catch(e) {
                    console.error("Fallo insertando", asigData, e);
                    failCount++;
                }
            }
            
            if (failCount === 0) {
                addNotification('success', "Asignación masiva finalizada correctamente.");
            } else {
                addNotification('warning', `Finalizado con ${failCount} errores. Revisa las asignaciones manuales.`);
            }
            fetchAsignaciones();
            fetchAsignacionesResumen();
        } catch (error: any) {
             addNotification('error', "Error general en asignación masiva");
        } finally {
            setIsSavingAsig(false);
        }
    };

    const exportAsignacionesExcel = () => {
        // Agrupar por bodega y dividir ítems entre parejas (misma lógica del backend)
        const exportData: any[] = [];
        const bodegasUnicas = Array.from(new Set(inventoryList.map(i => i.bodega)));

        for (const bodega of bodegasUnicas) {
            // Ítems de esta bodega ordenados geográficamente
            const itemsBodega = inventoryList
                .filter(i => i.bodega === bodega)
                .sort((a, b) => {
                    if ((a.bloque || '') !== (b.bloque || '')) return (a.bloque || '').localeCompare(b.bloque || '', undefined, { numeric: true });
                    if ((a.estante || '') !== (b.estante || '')) return (a.estante || '').localeCompare(b.estante || '', undefined, { numeric: true });
                    if ((a.nivel || '') !== (b.nivel || '')) return (a.nivel || '').localeCompare(b.nivel || '', undefined, { numeric: true });
                    return (a.codigo || '').localeCompare(b.codigo || '');
                });

            // Parejas únicas en esta bodega
            const parejasEnBodega = Array.from(new Set(
                asignaciones.filter(a => a.bodega === bodega).map(a => a.numero_pareja)
            )).sort((a, b) => a - b);

            const numParejas = parejasEnBodega.length;
            const chunkSize = numParejas > 0 ? Math.ceil(itemsBodega.length / numParejas) : 0;

            itemsBodega.forEach((item, idx) => {
                let parejaAsignada = 'Sin Asignar';
                let titular = '';
                let companero = '';

                if (numParejas > 0) {
                    const parejaIdx = Math.min(Math.floor(idx / chunkSize), numParejas - 1);
                    const numPareja = parejasEnBodega[parejaIdx];
                    const asig = asignaciones.find(a => a.bodega === bodega && a.numero_pareja === numPareja);
                    if (asig) {
                        parejaAsignada = `Pareja ${numPareja}`;
                        titular = asig.nombre;
                        companero = asig.nombre_companero || '';
                    }
                }

                exportData.push({
                    "Bodega": item.bodega,
                    "Bloque": item.bloque || '',
                    "Estante": item.estante || '',
                    "Nivel": item.nivel || '',
                    "Código Ítem": item.codigo,
                    "Descripción": item.descripcion,
                    "Nro Pareja": parejaAsignada,
                    "Titular": titular,
                    "Compañero": companero
                });
            });
        }

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet["!cols"] = [
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, 
            { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 30 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Asignaciones");
        XLSX.writeFile(workbook, "Reporte_Asignaciones_Planta.xlsx");
    };

    const handleEditAsig = (asig: any) => {
        setEditingAsigId(asig.id);
        setNewAsig({
            cedula: asig.cedula,
            nombre: asig.nombre,
            cargo: asig.cargo || '',
            cedula_companero: asig.cedula_companero || '',
            nombre_companero: asig.nombre_companero || '',
            bodega: asig.bodega
        });
    };

    const cancelEdit = () => {
        setEditingAsigId(null);
        setNewAsig({ cedula: '', nombre: '', cargo: '', cedula_companero: '', nombre_companero: '', bodega: '' });
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
        asignacionesResumen,
        isLoadingData,
        filters, setFilters,
        columnFilters, setColumnFilters,
        activeTab, setActiveTab,
        editingAsigId,
        // Handlers
        handleUploadMaestra,
        handleUploadTransito,
        handleSaveAsig,
        handleBulkSaveAsignaciones,
        exportAsignacionesExcel,
        handleDeleteAsig,
        handleEditAsig,
        cancelEdit,
        handleUpdateRonda,
        fetchStats,
        fetchInventoryList,
        fetchAsignacionesResumen,
        fetchCoverage,
        handleGeneratePlanilla0,
        // Helpers
        getBodegaOptions,
        buscarEmpleadoERP
    };
};
