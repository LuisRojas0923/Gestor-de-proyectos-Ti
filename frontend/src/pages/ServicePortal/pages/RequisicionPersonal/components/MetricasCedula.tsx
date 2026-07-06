import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Users, AlertTriangle, CheckCircle, RefreshCw,
  ChevronRight, Repeat2, Activity, BarChart2,
} from 'lucide-react';
import { Badge, Button, Input, Text, Title } from '../../../../../components/atoms';
import { FilterDropdown } from '../../../../../components/molecules/FilterDropdown';
import {
  getMetricasCedula, getConsolidadoCandidatos,
  MetricasCedulaItem, ConsolidadoRPItem,
} from '../services/requisicionService';
import { DetalleCandidatoDrawer } from './DetalleCandidatoDrawer';
import { MetricasAnalisisTab } from './MetricasAnalisisTab';

// ── helpers ───────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'default' }> = {
  CONTRATADO:   { label: 'Contratado',   variant: 'success'  },
  APLICA:       { label: 'Aplica',       variant: 'info'     },
  NO_APLICA:    { label: 'No Aplica',    variant: 'error'    },
  POR_EVALUAR:  { label: 'Por evaluar',  variant: 'warning'  },
};

const estadoBadge = (estado: string) => {
  const cfg = ESTADO_BADGE[estado] ?? { label: estado, variant: 'default' as const };
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
};


// ── Componente principal ──────────────────────────────────────────────────────

type Tab = 'consolidado' | 'analisis';

const MetricasCedula: React.FC = () => {
  const [tab, setTab] = useState<Tab>('consolidado');
  const [metricasCedula, setMetricasCedula] = useState<MetricasCedulaItem[]>([]);
  const [consolidado, setConsolidado] = useState<ConsolidadoRPItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroConsolidado, setFiltroConsolidado] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  
  // Detalle seleccionado
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState<MetricasCedulaItem | null>(null);

  const handleSelectCandidato = (cedula: string | null, nombre: string) => {
    if (!cedula) return;
    const found = metricasCedula.find(m => m.cedula === cedula);
    if (found) {
      setCandidatoSeleccionado(found);
    } else {
      setCandidatoSeleccionado({
        cedula,
        nombre,
        contratado: false,
        postulaciones_activas: 1,
        total_postulaciones: 1,
        historial: []
      });
    }
  };

  const getColumnOptions = React.useCallback((key: keyof ConsolidadoRPItem) => {
    const uniqueValues = Array.from(new Set(consolidado.map(r => String(r[key] || '').toUpperCase())));
    return uniqueValues.sort().map(v => ({ label: v, value: v }));
  }, [consolidado]);

  const cargar = async () => {
    setLoading(true);
    try {
      const [mc, cons] = await Promise.all([getMetricasCedula(), getConsolidadoCandidatos()]);
      setMetricasCedula(mc);
      setConsolidado(cons);
    } catch {
      // silencioso — sin datos disponibles aún
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalUnicos = metricasCedula.length;
  const recurrentes = metricasCedula.filter(m => m.total_postulaciones > 1).length;
  const paralelos   = metricasCedula.filter(m => m.postulaciones_activas > 1).length;
  const contratados = metricasCedula.filter(m => m.contratado).length;



  const consFiltrados = useMemo(() => {
    const q = filtroConsolidado.toLowerCase();
    
    return consolidado.filter(r => {
      // Búsqueda global
      const matchGlobal = !q || (
        r.nombre_candidato.toLowerCase().includes(q)
        || (r.cedula ?? '').includes(q)
        || r.cargo.toLowerCase().includes(q)
        || (r.area ?? '').toLowerCase().includes(q)
        || (r.ciudad ?? '').toLowerCase().includes(q)
      );
      if (!matchGlobal) return false;

      // Filtros de columna (Excel style)
      for (const [key, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        const rowValue = String((r as any)[key] || '').toUpperCase();
        if (!values.includes(rowValue)) return false;
      }

      return true;
    });
  }, [consolidado, filtroConsolidado, activeFilters]);

  return (
    <div className="space-y-5">
      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Candidatos únicos', value: totalUnicos, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Users },
          { label: 'Recurrentes (>1 RP)', value: recurrentes, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: Repeat2 },
          { label: 'Participación paralela', value: paralelos, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Activity },
          { label: 'Contratados', value: contratados, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <Text as="div" className={`text-2xl font-extrabold leading-none ${color}`}>{value}</Text>
              <Text variant="caption" className="text-[var(--color-text-secondary)] mt-0.5">{label}</Text>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
        {([
          { id: 'consolidado', label: 'Consolidado RP', icon: Users },
          { id: 'analisis', label: 'Análisis de Candidatos', icon: BarChart2 },
        ] as { id: Tab; label: string; icon: React.FC<any> }[]).map(({ id, label, icon: Icon }) => (
          <Button variant="custom"
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
        <div className="ml-auto pb-1">
          <Button variant="ghost" icon={RefreshCw} onClick={cargar} disabled={loading} className="text-xs">
            {loading ? 'Cargando…' : 'Actualizar'}
          </Button>
        </div>
      </div>



      {/* ── Tab: Consolidado RP ───────────────────────────────────────────────── */}
      {tab === 'consolidado' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
            </div>
          ) : consFiltrados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                <Users className="w-8 h-8 text-slate-200 dark:text-slate-700" />
              </div>
              <Title variant="h5" weight="bold" className="text-slate-400 dark:text-slate-700 mb-1 uppercase tracking-widest text-xs">Sin registros</Title>
              <Text size="xs" className="text-slate-400 dark:text-slate-600 max-w-xs">
                {filtroConsolidado ? 'No se encontraron resultados para ese filtro.' : 'No hay candidatos registrados en las requisiciones.'}
              </Text>
            </div>
          ) : (
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
              {/* Barra superior de control estilo excel */}
              <div className="flex-none p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <Text variant="caption" weight="bold" className="uppercase tracking-wider text-slate-500">
                    CONSOLIDADO DE CANDIDATOS
                  </Text>
                </div>
                
                <div className="flex-1 max-w-sm">
                  <Input
                    size="xs"
                    type="text"
                    placeholder="Filtrar por nombre, cédula, cargo, área o ciudad…"
                    value={filtroConsolidado}
                    onChange={e => setFiltroConsolidado(e.target.value)}
                    icon={Search}
                    className="!h-8"
                  />
                </div>

                <Text size="xs" color="text-secondary" className="text-[10px] font-bold">
                  {consFiltrados.length} REGISTROS
                </Text>
              </div>

              {/* Contenedor de la tabla scrollable */}
              <div className="flex-1 overflow-auto max-h-[520px]">
                <table className="w-full text-[11px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[var(--color-primary-900)] text-white shadow-md">
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-12 border-b border-white/5 border-r border-white/5 first:rounded-tl-xl">#</th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">RP</Text>
                          <FilterDropdown
                            options={getColumnOptions('rp')}
                            selectedOptions={activeFilters['rp'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, rp: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Candidato</Text>
                          <FilterDropdown
                            options={getColumnOptions('nombre_candidato')}
                            selectedOptions={activeFilters['nombre_candidato'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, nombre_candidato: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Cédula</Text>
                          <FilterDropdown
                            options={getColumnOptions('cedula')}
                            selectedOptions={activeFilters['cedula'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, cedula: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Cargo</Text>
                          <FilterDropdown
                            options={getColumnOptions('cargo')}
                            selectedOptions={activeFilters['cargo'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, cargo: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Área</Text>
                          <FilterDropdown
                            options={getColumnOptions('area')}
                            selectedOptions={activeFilters['area'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, area: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Ciudad</Text>
                          <FilterDropdown
                            options={getColumnOptions('ciudad')}
                            selectedOptions={activeFilters['ciudad'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, ciudad: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 border-r border-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Temporal</Text>
                          <FilterDropdown
                            options={getColumnOptions('empresa_temporal')}
                            selectedOptions={activeFilters['empresa_temporal'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, empresa_temporal: vals }))}
                            dark
                          />
                        </div>
                      </th>
                      <th className="text-center py-2 px-4 font-bold uppercase tracking-wider border-b border-white/5 last:rounded-tr-xl">
                        <div className="flex items-center justify-center gap-1">
                          <Text as="span" size="xs" color="inherit">Estado</Text>
                          <FilterDropdown
                            options={getColumnOptions('estado_candidato')}
                            selectedOptions={activeFilters['estado_candidato'] || []}
                            onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, estado_candidato: vals }))}
                            dark
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {consFiltrados.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="p-2 text-slate-400 font-mono w-12 border-r border-slate-100 dark:border-slate-800 text-center">{i + 1}</td>
                        <td className="p-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-100 dark:border-slate-800 text-center">{row.rp}</td>
                        <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-left pl-4 font-medium text-[var(--color-text-primary)]">
                          {row.cedula ? (
                            <Button variant="custom"
                              onClick={() => handleSelectCandidato(row.cedula, row.nombre_candidato)}
                              className="text-left font-bold text-indigo-650 dark:text-indigo-400 hover:underline hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                            >
                              {row.nombre_candidato}
                            </Button>
                          ) : (
                            <Text as="span" color="inherit">{row.nombre_candidato}</Text>
                          )}
                        </td>
                        <td className="p-2 font-mono border-r border-slate-100 dark:border-slate-800 text-center">{row.cedula ?? '—'}</td>
                        <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-left pl-4 text-[var(--color-text-primary)]">{row.cargo || '—'}</td>
                        <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-center">
                          <Badge variant="neutral" className="text-xs truncate max-w-[130px] inline-block" title={row.area}>
                            {row.area ?? '—'}
                          </Badge>
                        </td>
                        <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-center">{row.ciudad ?? '—'}</td>
                        <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">{row.empresa_temporal ?? '—'}</td>
                        <td className="p-2 text-center">{estadoBadge(row.estado_candidato)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Barra inferior de paginación/conteo */}
              <div className="flex-none p-2 border-t border-slate-100 dark:border-slate-700 text-right bg-slate-50/30 dark:bg-slate-900/30">
                <Text size="xs" color="text-secondary" className="text-[10px]">
                  Mostrando {consFiltrados.length} de {consolidado.length} registros
                </Text>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Análisis de Candidatos ───────────────────────────────────────── */}
      {tab === 'analisis' && (
        <MetricasAnalisisTab consolidado={consolidado} />
      )}

      {/* Drawer de Detalle del Candidato */}
      <DetalleCandidatoDrawer
        item={candidatoSeleccionado}
        onClose={() => setCandidatoSeleccionado(null)}
      />
    </div>
  );
};

export default MetricasCedula;
