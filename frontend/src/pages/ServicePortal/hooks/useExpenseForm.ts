import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

const API_BASE_URL = API_CONFIG.BASE_URL;
const CACHE_KEY = 'expense_form_cache';

const DEBUG_MARINA = true; // Cambiar a false para desactivar logs en consola
const logMarina = (msg: string, data: any = '') => {
    if (DEBUG_MARINA) console.log(`⚓ Marina Debug | ${new Date().toLocaleTimeString()} | ${msg}`, data);
};

export interface OTData {
    numero: string;
    cliente: string;
    centrocosto: string;
    subcentrocosto: string;
    especialidad?: string;
    ciudad?: string;
}

export interface LineaGasto {
    id: string;
    categoria: string;
    fecha: string;
    ot: string;
    ot_id?: string;
    cc: string;
    scc: string;
    valorConFactura: number;
    valorSinFactura: number;
    observaciones: string;
    combinacionesCC: OTData[];
    adjuntos: any[];
}

const generateId = () => {
    try {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
    } catch (e) {
        console.warn("randomUUID not available, using fallback");
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const useExpenseForm = () => {
    const [lineas, setLineas] = useState<LineaGasto[]>(() => {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.lineas && Array.isArray(parsed.lineas) && parsed.lineas.length > 0) {
                    return parsed.lineas;
                }
            } catch (e) {
                console.error("Error loading expense cache:", e);
            }
        }
        return [{
            id: generateId(),
            categoria: '',
            fecha: new Date().toISOString().split('T')[0],
            ot: '',
            cc: '',
            scc: '',
            valorConFactura: 0,
            valorSinFactura: 0,
            observaciones: '',
            combinacionesCC: [],
            adjuntos: []
        }];
    });

    const [observacionesGral, setObservacionesGral] = useState(() => {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.observacionesGral || '';
            } catch (e) {
                return '';
            }
        }
        return '';
    });

    const [ots, setOts] = useState<OTData[]>([]);
    const [isSearchingOT, setIsSearchingOT] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const { addNotification } = useNotifications();

    // Auto-save cada vez que cambian los datos
    useEffect(() => {
        const saveTimeout = setTimeout(() => {
            const dataToSave = { lineas, observacionesGral };
            localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));
            logMarina("💾 [DRAFT] Borrador actualizado en el almacenamiento local", {
                items: lineas.length,
                total: lineas.reduce((acc, l) => acc + Number(l.valorConFactura) + Number(l.valorSinFactura), 0)
            });
        }, 500); // Debounce de 500ms
        return () => clearTimeout(saveTimeout);
    }, [lineas, observacionesGral]);

    const addLinea = useCallback(() => {
        logMarina("➕ [UI] Agregando nueva línea de gasto");
        setLineas(prev => [...prev, {
            id: generateId(),
            categoria: '',
            fecha: new Date().toISOString().split('T')[0],
            ot: '',
            cc: '',
            scc: '',
            valorConFactura: 0,
            valorSinFactura: 0,
            observaciones: '',
            combinacionesCC: [],
            adjuntos: []
        }]);
    }, []);

    const removeLinea = useCallback((id: string) => {
        logMarina("❌ [UI] Removiendo línea de gasto", id);
        setLineas(prev => {
            if (prev.length > 1) {
                return prev.filter(l => l.id !== id);
            }
            addNotification('warning', 'Debe haber al menos una línea de gasto.');
            return prev;
        });
    }, [addNotification]);

    const updateLinea = useCallback((id: string, field: keyof LineaGasto, value: any) => {
        setLineas(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    }, []);

    const handleOTSearch = async (query: string, lineaId: string) => {
        // Al modificar manualmente la OT, reseteamos el contexto contable previo
        // para evitar que se guarden CC/SCC de una selección anterior (blindaje)
        setLineas(prev => prev.map(l => l.id === lineaId ? {
            ...l,
            ot: query,
            cc: '',
            scc: '',
            combinacionesCC: []
        } : l));

        if (query.length < 2) {
            setOts([]);
            setIsSearchingOT(null);
            return;
        }

        setIsSearchingOT(lineaId);
        try {
            logMarina("🔎 [API] Buscando OTs", query);
            const res = await axios.get(`${API_BASE_URL}/viaticos/ots?query=${query}`);
            const data = res.data;
            setOts(data);
            if (data.length === 0) {
                addNotification('info', `No se encontró la OT "${query}" o el cliente similar.`);
                setIsSearchingOT(null);
            }
        } catch (err) {
            console.error("Error buscando OTs:", err);
            setOts([]);
            setIsSearchingOT(null);
        }
    };

    const selectOT = async (ot: OTData, lineaId: string) => {
        setIsSearchingOT(lineaId);
        try {
            logMarina("✅ [UI] OT Seleccionada", ot.numero);
            const res = await axios.get(`${API_BASE_URL}/viaticos/ot/${ot.numero}/combinaciones`);
            const combinaciones: OTData[] = res.data;

            const ccsUnicos = Array.from(new Set(combinaciones.map(c => c.centrocosto?.trim()).filter(Boolean)));
            const autoCC = ccsUnicos.length === 1 ? (ccsUnicos[0] || '') : '';

            let autoSCC = '';
            if (autoCC) {
                const sccsDisp = combinaciones
                    .filter(c => c.centrocosto?.trim() === autoCC)
                    .map(c => c.subcentrocosto?.trim())
                    .filter(Boolean);

                if (sccsDisp.length === 1) {
                    autoSCC = sccsDisp[0] || '';
                }
            }

            setLineas(prev => prev.map(l => l.id === lineaId ? {
                ...l,
                ot: ot.numero,
                cc: autoCC,
                scc: autoSCC,
                combinacionesCC: combinaciones,
            } : l));
        } catch (err) {
            console.error("Error cargando combinaciones de OT:", err);
            addNotification('error', 'No se pudieron cargar los centros de costo de la OT.');
        } finally {
            setOts([]);
            setIsSearchingOT(null);
        }
    };

    const totalFacturado = lineas.reduce((acc, l) => acc + Number(l.valorConFactura), 0);
    const totalSinFactura = lineas.reduce((acc, l) => acc + Number(l.valorSinFactura), 0);
    const totalGeneral = totalFacturado + totalSinFactura;

    const clearForm = useCallback(() => {
        logMarina("🧹 [UI] Limpiando formulario completo y caché");
        const defaultLineas = [{
            id: generateId(),
            categoria: '',
            fecha: new Date().toISOString().split('T')[0],
            ot: '',
            cc: '',
            scc: '',
            valorConFactura: 0,
            valorSinFactura: 0,
            observaciones: '',
            combinacionesCC: [],
            adjuntos: []
        }];

        setLineas(defaultLineas);
        setObservacionesGral('');
        setValidationErrors({}); // Limpiar errores visuales

        // Limpiar localStorage de raíz
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_KEY + '_backup');
    }, []);

    const isFormEmpty = useCallback((lines: LineaGasto[]) => {
        if (lines.length > 1) return false;
        const l = lines[0];
        if (!l) return true;
        return !l.categoria && !l.ot && Number(l.valorConFactura) === 0 &&
            Number(l.valorSinFactura) === 0 && !l.observaciones &&
            (!l.adjuntos || l.adjuntos.length === 0);
    }, []);

    const loadLineas = useCallback(async (nuevasLineas: LineaGasto[], observaciones?: string) => {
        if (!nuevasLineas || nuevasLineas.length === 0) return;

        logMarina("📥 [LOAD] Solicitud de carga de datos externos", { count: nuevasLineas.length });

        // Backup seguro fuera del setter
        const currentData = { lineas, observacionesGral };
        if (!isFormEmpty(currentData.lineas)) {
            logMarina("🛡️ [BACKUP] Resguardando borrador actual antes de sobrescribir");
            localStorage.setItem(CACHE_KEY + '_backup', JSON.stringify({
                ...currentData,
                backupTimestamp: new Date().toISOString(),
                origin: 'AUTO_BACKUP_BEFORE_LOAD'
            }));
        }

        // --- RECUPERACIÓN DE COMBINACIONES CC/SCC ---
        // Para que los selectores funcionen, necesitamos las combinaciones de cada OT
        const otsUnicas = Array.from(new Set(nuevasLineas.map(l => l.ot).filter(Boolean)));
        const lineasConCombos = [...nuevasLineas];

        logMarina("🔄 [LOAD] Recuperando combinaciones para OTs:", otsUnicas);

        for (const otNum of otsUnicas) {
            try {
                const res = await axios.get(`${API_BASE_URL}/viaticos/ot/${otNum}/combinaciones`);
                const combos = res.data;
                // Asignar combos a todas las líneas que tengan esta OT
                lineasConCombos.forEach((l, idx) => {
                    if (l.ot === otNum) {
                        lineasConCombos[idx] = { ...l, combinacionesCC: combos };
                    }
                });
            } catch (err) {
                console.error(`Error recuperando combos para OT ${otNum}:`, err);
            }
        }

        setLineas(lineasConCombos);
        if (observaciones !== undefined) {
            setObservacionesGral(observaciones);
        }
    }, [isFormEmpty, lineas, observacionesGral]);

    const restoreBackup = useCallback(() => {
        const backup = localStorage.getItem(CACHE_KEY + '_backup');
        if (backup) {
            try {
                const parsed = JSON.parse(backup);
                logMarina("🔄 [RESTORE] Restaurando borrador desde respaldo del " + (parsed.backupTimestamp || 'archivo antiguo'));
                setLineas(parsed.lineas);
                setObservacionesGral(parsed.observacionesGral || '');
                localStorage.removeItem(CACHE_KEY + '_backup');
                return true;
            } catch (e) {
                console.error("Error al restaurar backup:", e);
            }
        }
        return false;
    }, []);

    const hasBackup = !!localStorage.getItem(CACHE_KEY + '_backup');

    return {
        lineas,
        setLineas,
        observacionesGral,
        setObservacionesGral,
        ots,
        setOts,
        isSearchingOT,
        setIsSearchingOT,
        addLinea,
        removeLinea,
        updateLinea,
        handleOTSearch,
        selectOT,
        totalFacturado,
        totalSinFactura,
        totalGeneral,
        clearForm,
        loadLineas,
        restoreBackup,
        hasBackup,
        validationErrors,
        setValidationErrors,
        logMarina
    };
};
