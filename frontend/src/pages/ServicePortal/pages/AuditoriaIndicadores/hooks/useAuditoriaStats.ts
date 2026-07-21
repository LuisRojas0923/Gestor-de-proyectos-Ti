import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../../../../../hooks/useApi';
import type { AuditoriaEstadisticas, AuditoriaEvento, AuditoriaEventosPaginados } from '../../../../../types/auditoria';

export type RangoPeriodo = 'hoy' | '7dias' | '30dias' | 'personalizado';

export function useAuditoriaStats() {
    const { get } = useApi<AuditoriaEstadisticas>();
    const { get: getEventos } = useApi<AuditoriaEventosPaginados>(); // Para listar eventos

    const [estadisticas, setEstadisticas] = useState<AuditoriaEstadisticas | null>(null);
    const [ultimosEventos, setUltimosEventos] = useState<AuditoriaEvento[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [periodo, setPeriodo] = useState<RangoPeriodo>('30dias');
    const [fechaDesde, setFechaDesde] = useState<string>('');
    const [fechaHasta, setFechaHasta] = useState<string>('');

    const activeDatesRef = useRef<{ desde?: string; hasta?: string }>({ desde: '', hasta: '' });

    // Trazabilidad de solicitudes, prevención de condiciones de carrera y Coalescing
    const requestIdRef = useRef<number>(0);
    const isFetchingRef = useRef<boolean>(false);
    const pendingRefreshRef = useRef<boolean>(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    const cargar = useCallback(async (desde?: string, hasta?: string, silencioso = false) => {
        // Coalescing: si ya hay una solicitud en curso, encolar una actualización sin lanzar request simultáneo
        if (isFetchingRef.current) {
            pendingRefreshRef.current = true;
            return;
        }

        isFetchingRef.current = true;
        const currentRequestId = ++requestIdRef.current;

        if (!silencioso) setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (desde) params.append('fecha_desde', desde);
            if (hasta) params.append('fecha_hasta', hasta);
            params.append('_t', Date.now().toString());

            const statsUrl = `/auditoria/estadisticas${params.toString() ? `?${params.toString()}` : ''}`;
            params.append('page', '1');
            params.append('page_size', '15');
            const eventosUrl = `/auditoria/eventos${params.toString() ? `?${params.toString()}` : ''}`;

            const [statsData, eventosData] = await Promise.all([
                get(statsUrl),
                getEventos(eventosUrl)
            ]);

            // Protección contra desorden/desincronización de respuestas viejas
            if (currentRequestId === requestIdRef.current) {
                if (statsData) {
                    setEstadisticas(statsData);
                }
                if (eventosData && eventosData.items) {
                    setUltimosEventos(eventosData.items);
                }
            }
        } catch (e) {
            if (currentRequestId === requestIdRef.current) {
                console.error("Error obteniendo estadísticas:", e);
                setError('Error al cargar las estadísticas de auditoría.');
            }
        } finally {
            if (currentRequestId === requestIdRef.current && !silencioso) {
                setIsLoading(false);
            }
            isFetchingRef.current = false;

            // Si llegó un evento durante la solicitud, ejecutar un único refresco coalescido con las fechas vigentes
            if (pendingRefreshRef.current) {
                pendingRefreshRef.current = false;
                const { desde: latestDesde, hasta: latestHasta } = activeDatesRef.current;
                cargar(latestDesde, latestHasta, true);
            }
        }
    }, [get, getEventos]);

    const cargarRef = useRef(cargar);
    useEffect(() => {
        cargarRef.current = cargar;
    }, [cargar]);

    useEffect(() => {
        const calcularFechas = () => {
            const hoy = new Date();
            const formatear = (d: Date) => d.toISOString().split('T')[0] + 'T00:00:00';
            const formatearFin = (d: Date) => d.toISOString().split('T')[0] + 'T23:59:59';

            let desde = '';
            let hasta = formatearFin(hoy);

            if (periodo === 'hoy') {
                desde = formatear(hoy);
            } else if (periodo === '7dias') {
                const hace7 = new Date(hoy);
                hace7.setDate(hoy.getDate() - 7);
                desde = formatear(hace7);
            } else if (periodo === '30dias') {
                const hace30 = new Date(hoy);
                hace30.setDate(hoy.getDate() - 30);
                desde = formatear(hace30);
            } else if (periodo === 'personalizado') {
                desde = fechaDesde ? `${fechaDesde}T00:00:00` : '';
                hasta = fechaHasta ? `${fechaHasta}T23:59:59` : '';
            }

            if (periodo !== 'personalizado' || (desde && hasta)) {
                activeDatesRef.current = { desde, hasta };
                cargar(desde, hasta);
            }
        };

        calcularFechas();
    }, [periodo, fechaDesde, fechaHasta, cargar]);

    useEffect(() => {
        let socket: WebSocket | null = null;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000;
        const maxDelay = 30000;
        let isUnmounted = false;
        let stabilityTimeoutId: ReturnType<typeof setTimeout> | null = null;

        const conectar = () => {
            if (isUnmounted) return;

            const token = localStorage.getItem('token');
            if (!token) return;

            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v2';
            let baseUrl = '';

            if (apiBase.startsWith('http')) {
                baseUrl = apiBase.replace(/^http/, 'ws');
            } else {
                const host = window.location.host;
                baseUrl = `${wsProtocol}//${host}${apiBase}`;
            }

            const wsUrl = `${baseUrl}/auditoria/ws/dashboard?token=${encodeURIComponent(token)}`;

            try {
                socket = new WebSocket(wsUrl);
            } catch (_) {
                return;
            }

            socket.onopen = () => {
                if (isUnmounted) {
                    try { socket?.close(1000, "Unmounted"); } catch (_) {}
                    return;
                }
                if (stabilityTimeoutId) clearTimeout(stabilityTimeoutId);
                stabilityTimeoutId = setTimeout(() => {
                    retryCount = 0;
                }, 5000);
            };

            socket.onmessage = (event) => {
                if (isUnmounted) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_INDICADORES') {
                        clearDebounceTimer();
                        debounceTimerRef.current = setTimeout(() => {
                            const { desde, hasta } = activeDatesRef.current;
                            cargarRef.current(desde, hasta, true);
                        }, 1500); // 1.5s debounce
                    }
                } catch (_) {}
            };

            socket.onclose = (event) => {
                clearDebounceTimer();
                if (isUnmounted) return;
                if (stabilityTimeoutId) clearTimeout(stabilityTimeoutId);

                // Códigos de cierre permanentes que no deben reintentarse
                const cierresPermanentes = [1000, 1002, 1003, 1007, 1008, 1009, 1010, 1011];
                if (cierresPermanentes.includes(event.code)) {
                    return;
                }

                if (retryCount < maxRetries) {
                    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
                    retryCount++;
                    timeoutId = setTimeout(conectar, delay);
                }
            };

            socket.onerror = () => {
                clearDebounceTimer();
                if (isUnmounted) return;
                try {
                    if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
                        socket.close();
                    }
                } catch (_) {}
            };
        };

        conectar();

        return () => {
            isUnmounted = true;
            clearDebounceTimer();
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                if (socket.readyState === WebSocket.OPEN) {
                    try { socket.close(1000, "Unmounted"); } catch (_) {}
                } else if (socket.readyState === WebSocket.CONNECTING) {
                    socket.onopen = () => {
                        try { socket?.close(1000, "Unmounted"); } catch (_) {}
                    };
                }
            }
            if (timeoutId) clearTimeout(timeoutId);
            if (stabilityTimeoutId) clearTimeout(stabilityTimeoutId);
        };
    }, [clearDebounceTimer]);

    return {
        estadisticas,
        setEstadisticas,
        ultimosEventos,
        isLoading,
        setIsLoading,
        error,
        setError,
        periodo,
        setPeriodo,
        fechaDesde,
        setFechaDesde,
        fechaHasta,
        setFechaHasta,
        computedDesde: activeDatesRef.current.desde,
        computedHasta: activeDatesRef.current.hasta,
        recargar: () => {
            const { desde, hasta } = activeDatesRef.current;
            cargar(desde, hasta);
        }
    };
}
