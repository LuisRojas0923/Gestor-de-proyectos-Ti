import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../../../../../hooks/useApi';
import { API_ENDPOINTS } from '../../../../../config/api';
import type { AuditoriaEstadisticas } from '../../../../../types/auditoria';

export type RangoPeriodo = 'hoy' | '7dias' | '30dias' | 'personalizado';

export function useAuditoriaStats() {
    const { get } = useApi<AuditoriaEstadisticas>();

    const [estadisticas, setEstadisticas] = useState<AuditoriaEstadisticas | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [periodo, setPeriodo] = useState<RangoPeriodo>('30dias');
    const [fechaDesde, setFechaDesde] = useState<string>('');
    const [fechaHasta, setFechaHasta] = useState<string>('');
    const activeDatesRef = useRef<{ desde?: string; hasta?: string }>({});

    const cargar = useCallback(async (
        desde?: string,
        hasta?: string,
        silencioso = false,
        forzarRecarga = false,
    ) => {
        if (!silencioso) setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (desde) params.append('fecha_desde', desde);
            if (hasta) params.append('fecha_hasta', hasta);
            if (forzarRecarga) params.append('_t', Date.now().toString());

            const statsUrl = `${API_ENDPOINTS.AUDIT_STATS}${params.toString() ? `?${params.toString()}` : ''}`;
            const statsData = await get(statsUrl);

            if (statsData) {
                setEstadisticas(statsData);
            }
        } catch (e) {
            console.error("Error obteniendo estadísticas:", e);
            setError('Error al cargar las estadísticas de auditoría.');
        } finally {
            if (!silencioso) setIsLoading(false);
        }
    }, [get]);

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

    return {
        estadisticas,
        isLoading,
        error,
        periodo,
        setPeriodo,
        fechaDesde,
        setFechaDesde,
        fechaHasta,
        setFechaHasta,
        recargar: () => cargar(activeDatesRef.current.desde, activeDatesRef.current.hasta, false, true),
    };
}
