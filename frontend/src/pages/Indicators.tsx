import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Clock,
  Download
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { Title, Text, Button } from '../components/atoms';
import { API_ENDPOINTS } from '../config/api';
import { useAppContext } from '../context/AppContext';

// Sub-componentes modulares
import IndicatorsSummary from './Indicators/IndicatorsSummary';
import IndicatorsTimeView from './Indicators/IndicatorsTimeView';
import IndicatorsVolumeView from './Indicators/IndicatorsVolumeView';

const Indicators: React.FC = () => {
  const { get } = useApi<any>();
  const { state } = useAppContext();
  const { refreshKey } = state;
  const [view, setView] = useState<'volume' | 'time'>('volume');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBIData = async () => {
      try {
        const biData = await get(API_ENDPOINTS.TICKET_STATS_BI);
        if (biData) setData(biData);
      } catch (error) {
        console.error("Error cargando indicadores BI:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBIData();
  }, [get, refreshKey]);

  if (isLoading) return (
    <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mb-4"></div>
      <Text variant="body1" color="text-secondary" weight="bold">Generando reporte analítico de gestión TI...</Text>
    </div>
  );

  if (!data) return <div className="p-10 text-center">No se encontraron datos analíticos.</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Header con Selección de Vista */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Title variant="h1" weight="bold" color="text-primary" className="mb-2">
            Indicadores de Gestión TI (BI)
          </Title>
          <Text variant="body1" color="text-secondary" weight="medium">Panel analítico para la toma de decisiones basada en datos reales</Text>
        </div>

        <div className="flex items-center bg-[var(--color-surface)] p-1.5 rounded-[1.5rem] border border-[var(--color-border)] shadow-sm">
          <Button
            variant={view === 'volume' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('volume')}
            className={`rounded-xl px-6 transition-all ${view === 'volume' ? 'shadow-lg shadow-[var(--color-primary)]/20' : ''}`}
            icon={BarChart2}
          >
            N Tickets
          </Button>
          <Button
            variant={view === 'time' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('time')}
            className={`rounded-xl px-6 transition-all ${view === 'time' ? 'shadow-lg shadow-[var(--color-primary)]/20' : ''}`}
            icon={Clock}
          >
            Análisis Tiempos
          </Button>
        </div>
      </div>

      {/* KPIs Globales */}
      {data?.resumen && <IndicatorsSummary data={data.resumen} />}

      {/* Contenido Dinámico según Vista */}
      <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        {view === 'volume' ? (
          <IndicatorsVolumeView
            causaStats={data.causa_stats}
            areaStats={data.area_stats}
            analistaStats={data.analista_stats}
            matriz={data.matriz_observacion}
            headers={data.analistas_header}
            prioridadStats={data.prioridad_stats}
          />
        ) : (
          <IndicatorsTimeView
            areaStats={data.area_stats}
            timeline={data.timeline}
            causaStats={data.causa_stats}
          />
        )}
      </div>

      {/* Footer / Acciones */}
      <div className="flex justify-end pt-4">
        <Button variant="ghost" size="sm" icon={Download} className="text-[var(--color-text-secondary)]">
          Exportar reporte Excel (.xlsx)
        </Button>
      </div>
    </div>
  );
};

export default Indicators;
