import React, { useState, useMemo } from 'react';
import { MaterialCard as Card, Title, Text, ProgressBar, Select, Button } from '../../../../../components/atoms';
import { Users, Activity, ChevronDown, ChevronUp, Clock, Filter } from 'lucide-react';
import type { StatsPorModulo, AuditoriaEvento } from '../../../../../types/auditoria';
import { humanizarModulo, humanizarAccionDetallada } from '../utils/humanizer';

interface EventosPorModuloProps {
  datos: StatsPorModulo[];
}

const MODULOS_DISPONIBLES = [
  { value: 'todos', label: 'Todos los módulos' },
  { value: 'auth', label: 'Control de Acceso' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'requisiciones', label: 'Requisiciones' },
  { value: 'sistemas', label: 'Sistemas' },
  { value: 'actividades', label: 'Actividades' },
  { value: 'impuestos', label: 'Gestión Tributaria' },
  { value: 'comisiones', label: 'Nómina: Comisiones' },
  { value: 'inventario', label: 'Inventario Anual de TI' },
];

const EventosPorModulo: React.FC<EventosPorModuloProps> = ({ datos }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [filtroModulo, setFiltroModulo] = useState('todos');

  const datosAgrupados = useMemo(() => {
    const datosFiltrados = datos.filter(item => {
      if (filtroModulo === 'todos') return true;
      const mod = (item.modulo || '').toLowerCase();

      if (filtroModulo === 'auth' && mod === 'auth') return true;
      if (filtroModulo === 'viaticos' && mod.includes('viaticos')) return true;
      if (filtroModulo === 'requisiciones' && mod.includes('requisiciones')) return true;
      if (filtroModulo === 'sistemas' && mod.includes('sistemas')) return true;
      if (filtroModulo === 'actividades' && mod.includes('actividades')) return true;
      if (filtroModulo === 'impuestos' && mod === 'impuestos') return true;
      if (filtroModulo === 'comisiones' && mod === 'comisiones') return true;
      if (filtroModulo === 'inventario' && mod.includes('inventario')) return true;

      return mod.includes(filtroModulo);
    });

    const mapa = new Map<string, StatsPorModulo>();
    datosFiltrados.forEach(item => {
      const nombreHumanizado = humanizarModulo(item.modulo);
      if (mapa.has(nombreHumanizado)) {
        const existente = mapa.get(nombreHumanizado)!;
        existente.total += item.total;
        if (item.usuarios_unicos) {
            existente.usuarios_unicos = (existente.usuarios_unicos || 0) + item.usuarios_unicos;
        }
        if (item.ultimos_eventos) {
            existente.ultimos_eventos = [...(existente.ultimos_eventos || []), ...item.ultimos_eventos];
            existente.ultimos_eventos.sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
            existente.ultimos_eventos = existente.ultimos_eventos.slice(0, 5);
        }
      } else {
        // Deep copy to avoid mutating the original array elements
        mapa.set(nombreHumanizado, {
          ...item,
          modulo: nombreHumanizado, // use humanized name as key
          ultimos_eventos: item.ultimos_eventos ? [...item.ultimos_eventos] : undefined
        });
      }
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [datos, filtroModulo]);

  const maxTotal = Math.max(...datosAgrupados.map(d => d.total), 1);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-full max-h-[380px] overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="mb-4 flex-shrink-0 flex items-center justify-between gap-4">
          <div>
            <Title variant="h6">Actividad por Módulo</Title>
            <Text variant="caption" color="text-secondary">Uso del sistema y usuarios únicos</Text>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-48">
            <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <Select
              id="filtro-modulo-eventos"
              options={MODULOS_DISPONIBLES}
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              size="sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
          {datosAgrupados.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <Text variant="body2" color="text-secondary">No hay datos para este período.</Text>
            </div>
          ) : (
            <div className="space-y-4">
              {datosAgrupados.map((item, index) => {
                const porcentaje = (item.total / maxTotal) * 100;
                const isExpanded = expandedIndex === index;
                const hasEvents = item.ultimos_eventos && item.ultimos_eventos.length > 0;

                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <Button
                      variant="custom"
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`eventos-modulo-${index}`}
                      aria-label={`Ver eventos de ${item.modulo}`}
                      className={`w-full flex justify-between items-end bg-transparent p-0 border-0 hover:bg-transparent ${hasEvents ? 'cursor-pointer group' : ''}`}
                      onClick={() => hasEvents && toggleExpand(index)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {hasEvents && (
                          <div className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        )}
                        <Text variant="body2" className="font-medium truncate text-[var(--color-text-primary)]" title={item.modulo}>
                          {item.modulo}
                        </Text>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-secondary)] font-medium">
                        {item.usuarios_unicos !== undefined && (
                          <div className="flex items-center gap-1" title="Usuarios únicos">
                            <Users className="w-3.5 h-3.5" />
                            <Text as="span" variant="caption" color="inherit" className="text-[11px]">
                              {item.usuarios_unicos} {item.usuarios_unicos === 1 ? 'usr' : 'usrs'}
                            </Text>
                          </div>
                        )}
                        <div className="flex items-center gap-1" title="Eventos totales">
                          <Activity className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <Text as="span" variant="caption" color="inherit" className="text-[11px]">
                            {item.total.toLocaleString()} evts
                          </Text>
                        </div>
                      </div>
                    </Button>

                    <ProgressBar progress={porcentaje} variant="primary" className="h-1.5" />

                    {/* Acordeón de detalles */}
                    {isExpanded && hasEvents && (
                      <div id={`eventos-modulo-${index}`} className="mt-2 pl-6 pr-2 py-2 bg-[var(--color-surface-variant)] bg-opacity-30 rounded-lg border border-[var(--color-border)] border-opacity-50 space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                        <Text variant="caption" className="font-semibold text-[var(--color-primary)] block mb-1 sticky top-0 bg-[var(--color-surface-variant)] z-10 py-1">Últimas interacciones:</Text>
                        {item.ultimos_eventos!.map((evento) => {
                          let fechaFormateada = 'N/A';
                          if (evento.timestamp) {
                            const d = new Date(evento.timestamp);
                            fechaFormateada = new Intl.DateTimeFormat('es-CO', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(d);
                          }

                          return (
                            <div key={evento.id} className="flex flex-col gap-0.5 pb-2 border-b border-[var(--color-border)] border-opacity-30 last:border-0 last:pb-0">
                              <div className="flex justify-between items-start gap-2">
                                <Text variant="body2" className="font-medium text-[var(--color-text-primary)] truncate" title={evento.usuario_nombre || evento.usuario_id}>
                                  {evento.usuario_nombre || evento.usuario_id}
                                </Text>
                                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] flex-shrink-0">
                                  <Clock className="w-3 h-3" />
                                  <Text as="span" variant="caption" color="inherit">{fechaFormateada}</Text>
                                </div>
                              </div>
                              <Text variant="caption" className="text-[var(--color-text-secondary)] leading-tight">
                                {humanizarAccionDetallada(evento as AuditoriaEvento)}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EventosPorModulo;
