import React from 'react';
import { Title, Text, Button } from '../../../../components/atoms';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { Callout } from '../../../../components/molecules';
import PeriodSelector from './components/PeriodSelector';
import KpiCards from './components/KpiCards';
import EventosPorModulo from './components/EventosPorModulo';
import TiposFallos from './components/TiposFallos';
import ActividadEnTiempo from './components/ActividadEnTiempo';

import { useAuditoriaStats } from './hooks/useAuditoriaStats';

const AuditoriaIndicadores: React.FC = () => {
  const {
    estadisticas,
    isLoading,
    error,
    periodo,
    setPeriodo,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    recargar
  } = useAuditoriaStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-neutral-700">
            <Activity className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <Title variant="h3" className="font-bold">Indicadores de Auditoría</Title>
            <Text variant="body2" color="text-secondary">
              Métricas y gráficas de actividad en el sistema
            </Text>
          </div>
        </div>
        <Button variant="secondary" onClick={recargar} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <PeriodSelector
        periodo={periodo}
        setPeriodo={setPeriodo}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
      />

      {error ? (
        <Callout variant="error" title="No se pudieron cargar los indicadores" role="alert">
          {error}
        </Callout>
      ) : isLoading && !estadisticas ? (
        <div className="flex justify-center items-center h-64" role="status" aria-live="polite">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
          <Text className="sr-only">Cargando indicadores de auditoría</Text>
        </div>
      ) : estadisticas ? (
        <>
          {/* Fila 1: KPI Cards */}
          <KpiCards stats={estadisticas} />

          {/* Fila 2: Gráficas Principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <EventosPorModulo datos={estadisticas.por_modulo} />
            <TiposFallos datos={estadisticas.tipos_fallos} />
          </div>

          {/* Fila 3: Actividad en el Tiempo */}
          <div className="mb-6">
            <ActividadEnTiempo datos={estadisticas.por_dia} />
          </div>

        </>
      ) : null}
    </div>
  );
};

export default AuditoriaIndicadores;
