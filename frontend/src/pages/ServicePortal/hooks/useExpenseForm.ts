import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

const API_BASE_URL = API_CONFIG.BASE_URL;
const CACHE_KEY = 'expense_form_cache';

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
    const { addNotification } = useNotifications();

    // Auto-save cada vez que cambian los datos
    useEffect(() => {
        const saveTimeout = setTimeout(() => {
            const dataToSave = { lineas, observacionesGral };
            localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));
        }, 500); // Debounce de 500ms
        return () => clearTimeout(saveTimeout);
    }, [lineas, observacionesGral]);

    const addLinea = useCallback(() => {
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
        updateLinea(lineaId, 'ot', query);
        if (query.length < 2) {
            setOts([]);
            setIsSearchingOT(null);
            return;
        }

        setIsSearchingOT(lineaId);
        try {
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
        setLineas([{
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
        setObservacionesGral('');
        localStorage.removeItem(CACHE_KEY);
    }, []);

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
        clearForm
    };
};
