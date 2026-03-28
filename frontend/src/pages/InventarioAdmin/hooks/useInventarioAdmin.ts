import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';

export interface InventoryConfig {
    ronda_activa: number;
    conteo_nombre?: string;
}

export interface ERP_Empleado {
    nombre: string;
    cargo?: string;
}

export const useInventarioAdmin = () => {
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
    const [stats, setStats] = useState({ total: 0, conciliados: 0, erroneos: 0, discrepantes: 0, pendientes: 0, reconteo: 0, porcentaje_avance: 0 });
    const [coverage, setCoverage] = useState<{cobertura: number, total_ubicaciones_pendientes: number, cubiertos: number, faltantes: string[]}>({cobertura: 0, total_ubicaciones_pendientes: 0, cubiertos: 0, faltantes: []});
    const [inventoryList, setInventoryList] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [filters, setFilters] = useState({ bodega: '', estado: '', search: '' });

    // Navegación por Pestañas
    const [activeTab, setActiveTab] = useState<'config' | 'monitor' | 'validation'>('monitor');

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
                buscarEmpleadoERP(newAsig.cedula);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [newAsig.cedula]);

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
                onUploadProgress: (progressEvent) => {
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
                onUploadProgress: (progressEvent) => {
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
                setEditingAsigId(null);
            } else {
                await axios.post(`${API_CONFIG.BASE_URL}/inventario/asignar`, newAsig, { headers });
            }
            setNewAsig({ cedula: '', nombre: '', cargo: '', bodega: '', bloque: '', estante: '', nivel: '' });
            fetchAsignaciones();
        } catch (error) {
            alert(editingAsigId ? "Error al actualizar asignación" : "Error al guardar asignación");
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
            bodega: asig.bodega,
            bloque: asig.bloque,
            estante: asig.estante || '',
            nivel: asig.nivel || ''
        });
    };

    const cancelEdit = () => {
        setEditingAsigId(null);
        setNewAsig({ cedula: '', nombre: '', cargo: '', bodega: '', bloque: '', estante: '', nivel: '' });
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

    const buscarEmpleadoERP = async (cedula: string) => {
        setIsSearchingEmpleado(true);
        try {
            const response = await axios.get<ERP_Empleado>(`${API_CONFIG.BASE_URL}/erp/empleado/${cedula}`, { headers });
            if (response.data) {
                setNewAsig(prev => ({
                    ...prev,
                    nombre: response.data.nombre || '',
                    cargo: response.data.cargo || ''
                }));
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

    // Helpers para Opciones de Selectores (Cascada)
    const getBodegaOptions = () => {
        const unique = Array.from(new Set(inventoryList.map(i => i.bodega))).filter(Boolean);
        return [{ value: '', label: 'Seleccionar Bodega' }, ...unique.map(b => ({ value: b, label: b }))];
    };

    const getBloqueOptions = (bodega: string) => {
        if (!bodega) return [{ value: '', label: 'Bodega requerida' }];
        const unique = Array.from(new Set(inventoryList.filter(i => i.bodega === bodega).map(i => i.bloque))).filter(Boolean);
        return [{ value: '', label: 'Seleccionar Bloque' }, ...unique.map(b => ({ value: b, label: b }))];
    };

    const getEstanteOptions = (bodega: string, bloque: string) => {
        if (!bloque) return [{ value: '', label: 'Bloque requerido' }];
        const unique = Array.from(new Set(inventoryList.filter(i => i.bodega === bodega && i.bloque === bloque).map(i => i.estante))).filter(Boolean);
        return [{ value: '', label: 'Seleccionar Estante' }, ...unique.map(e => ({ value: e, label: e }))];
    };

    const getNivelOptions = (bodega: string, bloque: string, estante: string) => {
        if (!estante) return [{ value: '', label: 'Estante requerido' }];
        const unique = Array.from(new Set(inventoryList.filter(i => i.bodega === bodega && i.bloque === bloque && i.estante === estante).map(i => i.nivel))).filter(Boolean);
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
        // Helpers
        getBodegaOptions,
        getBloqueOptions,
        getEstanteOptions,
        getNivelOptions
    };
};
