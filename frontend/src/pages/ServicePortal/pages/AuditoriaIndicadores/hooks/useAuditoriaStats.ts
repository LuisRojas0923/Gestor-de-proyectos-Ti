import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../../../../../hooks/useApi';
import type { AuditoriaEstadisticas, AuditoriaEvento } from '../../../../../types/auditoria';

export type RangoPeriodo = 'hoy' | '7dias' | '30dias' | 'personalizado';

export function useAuditoriaStats() {
    const { get } = useApi<AuditoriaEstadisticas>();
    const { get: getEventos } = useApi<unknown>(); // Para listar eventos

    const [estadisticas, setEstadisticas] = useState<AuditoriaEstadisticas | null>(null);
    const [ultimosEventos, setUltimosEventos] = useState<AuditoriaEvento[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [periodo, setPeriodo] = useState<RangoPeriodo>('30dias');
    const [fechaDesde, setFechaDesde] = useState<string>('');
    const [fechaHasta, setFechaHasta] = useState<string>('');

    const activeDatesRef = useRef<{ desde?: string; hasta?: string }>({ desde: '', hasta: '' });

    const cargar = useCallback(async (desde?: string, hasta?: string, silencioso = false) => {
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

            if (statsData) {
                setEstadisticas(statsData);
            }
            if (eventosData && eventosData.items) {
                setUltimosEventos(eventosData.items);
            }
        } catch (e) {
            console.error("Error obteniendo estadísticas:", e);
            setError('Error al cargar las estadísticas de auditoría.');
        } finally {
            if (!silencioso) setIsLoading(false);
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
        const maxRetries = 10;
        const baseDelay = 1000;
        const maxDelay = 30000;
        let isUnmounted = false;

        const conectar = () => {
            if (isUnmounted) return;

            const token = localStorage.getItem('token');
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.host;
            const wsUrl = wsHost.includes('localhost')
                ? `${wsProtocol}//localhost:8000/api/v2/auditoria/ws/dashboard`
                : `${wsProtocol}//${wsHost}/api/v2/auditoria/ws/dashboard`;

            socket = new WebSocket(wsUrl, token ? ["auth", token] : []);

            socket.onopen = () => {
                retryCount = 0; // Reset retries on successful connection
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_INDICADORES') {
                        const { desde, hasta } = activeDatesRef.current;
                        cargarRef.current(desde, hasta, true);
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            socket.onclose = (event) => {
                if (isUnmounted) return;

                // 1008 = Policy Violation (invalid/expired token, no permission, etc.)
                if (event.code === 1008) {
                    console.warn("WebSocket cerrado por violación de política (1008). No se intentará reconectar.");
                    return;
                }

                if (retryCount < maxRetries) {
                    // Exponential backoff
                    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
                    retryCount++;
                    timeoutId = setTimeout(conectar, delay);
                } else {
                    console.error("Máximo número de reconexiones WS alcanzado.");
                }
            };

            socket.onerror = () => {
                socket?.close();
            };
        };

        conectar();

        return () => {
            isUnmounted = true;
            if (socket) {
                socket.onclose = null; // Prevenir reconexión tras desmontar
                socket.close();
            }
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

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
