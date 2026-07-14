import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../../../../../hooks/useApi';
import type { AuditoriaEstadisticas } from '../../../../../types/auditoria';

export type RangoPeriodo = 'hoy' | '7dias' | '30dias' | 'personalizado';

export function useAuditoriaStats() {
    const { get } = useApi<AuditoriaEstadisticas>();
    const { get: getEventos } = useApi<any>(); // Para listar eventos
    
    const [estadisticas, setEstadisticas] = useState<AuditoriaEstadisticas | null>(null);
    const [ultimosEventos, setUltimosEventos] = useState<any[]>([]);
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
        let timeoutId: any = null;

        const conectar = () => {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.host;
            const wsUrl = wsHost.includes('localhost')
                ? `${wsProtocol}//localhost:8000/api/v2/auditoria/ws/dashboard`
                : `${wsProtocol}//${wsHost}/api/v2/auditoria/ws/dashboard`;

            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_INDICADORES') {
                        const { desde, hasta } = activeDatesRef.current;
                        cargar(desde, hasta, true);
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            socket.onclose = () => {
                timeoutId = setTimeout(conectar, 5000);
            };

            socket.onerror = () => {
                socket?.close();
            };
        };

        conectar();

        return () => {
            if (socket) socket.close();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [cargar]);

    return {
        estadisticas,
        ultimosEventos,
        isLoading,
        error,
        periodo,
        setPeriodo,
        fechaDesde,
        setFechaDesde,
        fechaHasta,
        setFechaHasta,
        recargar: () => {
            const { desde, hasta } = activeDatesRef.current;
            cargar(desde, hasta);
        }
    };
}
