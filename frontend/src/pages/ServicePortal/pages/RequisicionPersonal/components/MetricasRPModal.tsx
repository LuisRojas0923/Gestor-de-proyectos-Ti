import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart2, TrendingUp, Users, CheckCircle, Target, Award, AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Button, Select, Text, Title } from '../../../../../components/atoms';
import type { RequisicionRP, CandidatoRequisicion } from '../types/requisicion.types';
import { ESTADO_LABELS } from '../types/requisicion.types';
import { getCandidatos } from '../services/requisicionService';

// ── Tipos internos ────────────────────────────────────────────────────────────

interface StatsTemporalRow {
  temporal: string;
  hv: number;
  contratados: number;
  descartados: number;
}

interface MetricasRPModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisiciones: RequisicionRP[];
}

import { CAUSALES_LABEL_MAP, fmt, MESES, COLORES_CHART, ESTADO_COLOR_MAP, KpiCard, CustomTooltip } from './MetricasUtils';

// ── Componente principal ──────────────────────────────────────────────────────

const MetricasRPModal: React.FC<MetricasRPModalProps> = ({ isOpen, onClose, requisiciones }) => {
  const now = new Date();
  const [mesFiltro, setMesFiltro] = useState(String(now.getMonth())); // 0-11
  const [anioFiltro, setAnioFiltro] = useState(String(now.getFullYear()));
  const [candidatosPorRP, setCandidatosPorRP] = useState<Record<number, CandidatoRequisicion[]>>({});
  const [loadingCandidatos, setLoadingCandidatos] = useState(false);

  // Años disponibles (desde el primer registro hasta hoy)
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    set.add(now.getFullYear());
    requisiciones.forEach(r => {
      const d = fmt(r.fecha_decision_gerente);
      if (d) set.add(d.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [requisiciones]);

  // Opciones Select
  const opcionesMes = MESES.map((m, i) => ({ value: String(i), label: m }));
  const opcionesAnio = aniosDisponibles.map(a => ({ value: String(a), label: String(a) }));

  // RP filtradas por mes/año seleccionado
  const rpFiltradas = useMemo(() => {
    const mes = parseInt(mesFiltro);
    const anio = parseInt(anioFiltro);
    return requisiciones.filter(r => {
      const d = fmt(r.fecha_decision_gerente);
      if (!d) return false;
      return d.getMonth() === mes && d.getFullYear() === anio;
    });
  }, [requisiciones, mesFiltro, anioFiltro]);

  // Cargar candidatos de las RPs filtradas cuando cambia el filtro
  useEffect(() => {
    if (!isOpen || rpFiltradas.length === 0) return;
    setLoadingCandidatos(true);
    const ids = rpFiltradas.map(r => r.id);
    Promise.all(ids.map(id => getCandidatos(id).then(cs => ({ id, cs }))))
      .then(results => {
        const map: Record<number, CandidatoRequisicion[]> = {};
        results.forEach(({ id, cs }) => { map[id] = cs; });
        setCandidatosPorRP(map);
      })
      .catch(() => {})
      .finally(() => setLoadingCandidatos(false));
  }, [isOpen, rpFiltradas]);

  // ── Cálculos KPIs ────────────────────────────────────────────────────────────

  const totalHV = useMemo(() => {
    return rpFiltradas.reduce((acc, r) => acc + (candidatosPorRP[r.id]?.length ?? 0), 0);
  }, [rpFiltradas, candidatosPorRP]);

  const totalContratados = useMemo(() => {
    return rpFiltradas.reduce((acc, r) => {
      return acc + (candidatosPorRP[r.id]?.filter(c => c.estado === 'CONTRATADO').length ?? 0);
    }, 0);
  }, [rpFiltradas, candidatosPorRP]);

  const tasaExito = totalHV > 0 ? Math.round((totalContratados / totalHV) * 100) : 0;
  const rpCerradas = rpFiltradas.filter(r => r.estado === 'CERRADA').length;

  // ── Tiempo promedio de gestión (días desde recepción GH → cierre o cancelación) ──
  const promediodiasGestion = useMemo(() => {
    const tiempos: number[] = [];
    rpFiltradas.forEach(r => {
      const inicio = fmt(r.fecha_decision_gerente);
      if (!inicio) return;
      // Fecha de cierre: usar fecha_cierre si existe, si no updated_at para CERRADA/CANCELADA
      const fin = fmt(r.fecha_cierre) ?? ((['CERRADA', 'CANCELADA'].includes(r.estado)) ? fmt(r.updated_at) : null);
      if (!fin) return;
      const dias = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      if (dias >= 0) tiempos.push(dias);
    });
    if (tiempos.length === 0) return null;
    return Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
  }, [rpFiltradas]);

  // ── Datos Gráfica 1: HV por empresa temporal ─────────────────────────────────

  const dataTemporales = useMemo<StatsTemporalRow[]>(() => {
    const map: Record<string, StatsTemporalRow> = {};
    rpFiltradas.forEach(r => {
      (candidatosPorRP[r.id] ?? []).forEach(c => {
        const key = c.nombre_temporal ?? 'Sin empresa';
        if (!map[key]) map[key] = { temporal: key, hv: 0, contratados: 0, descartados: 0 };
        map[key].hv++;
        if (c.estado === 'CONTRATADO') map[key].contratados++;
        if (c.estado === 'NO_APLICA') map[key].descartados++;
      });
    });
    return Object.values(map).sort((a, b) => b.hv - a.hv).slice(0, 8);
  }, [rpFiltradas, candidatosPorRP]);

  // ── Datos Gráfica 2: Distribución de estados ─────────────────────────────────

  const dataEstados = useMemo(() => {
    const map: Record<string, number> = {};
    rpFiltradas.forEach(r => {
      map[r.estado] = (map[r.estado] ?? 0) + 1;
    });
    return Object.entries(map).map(([estado, value]) => ({
      name: ESTADO_LABELS[estado as keyof typeof ESTADO_LABELS] ?? estado,
      value,
      estado,
    }));
  }, [rpFiltradas]);

  // ── Datos Gráfica 3: Evolución mensual histórica ──────────────────────────────

  const dataEvolucion = useMemo(() => {
    const anio = parseInt(anioFiltro);
    const porMes: Record<number, number> = {};
    for (let i = 0; i < 12; i++) porMes[i] = 0;
    requisiciones.forEach(r => {
      const d = fmt(r.fecha_decision_gerente);
      if (d && d.getFullYear() === anio) {
        porMes[d.getMonth()]++;
      }
    });
    return MESES.map((mes, i) => ({ mes: mes.substring(0, 3), rp: porMes[i] }));
  }, [requisiciones, anioFiltro]);

  // ── Causales de descarte ──────────────────────────────────────────────────────

  const dataCausales = useMemo(() => {
    const map: Record<string, number> = {};
    rpFiltradas.forEach(r => {
      (candidatosPorRP[r.id] ?? [])
        .filter(c => c.estado === 'NO_APLICA' && c.causal_descarte)
        .forEach(c => {
          const key = c.causal_descarte!;
          map[key] = (map[key] ?? 0) + 1;
        });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([causal, count]) => ({
        causal,
        label: CAUSALES_LABEL_MAP[causal] ?? causal, // nombre completo o el código si no está mapeado
        count,
      }));
  }, [rpFiltradas, candidatosPorRP]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)] overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={onClose} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl">
            Volver
          </Button>
          <div className="w-px h-6 bg-[var(--color-border)]" />
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <Title variant="h4" weight="bold">Métricas RP — Gestión Humana</Title>
            <Text variant="caption" className="text-[var(--color-text-secondary)] uppercase tracking-wider">
              Análisis de requisiciones y proceso de selección
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtro Mes/Año */}
          <div className="flex items-center gap-2">
            <Select
              value={mesFiltro}
              onChange={e => setMesFiltro(e.target.value)}
              options={opcionesMes}
              size="sm"
              className="w-36"
            />
            <Select
              value={anioFiltro}
              onChange={e => setAnioFiltro(e.target.value)}
              options={opcionesAnio}
              size="sm"
              className="w-24"
            />
          </div>
        </div>
      </div>

      {/* ── Cuerpo con scroll ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard
            label="RP en el período"
            value={rpFiltradas.length}
            sub={`${MESES[parseInt(mesFiltro)]} ${anioFiltro}`}
            icon={Target}
            color="text-indigo-600"
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          />
          <KpiCard
            label="Tasa de éxito"
            value={`${tasaExito}%`}
            sub={`${totalContratados} contratados de ${totalHV} HV`}
            icon={TrendingUp}
            color="text-emerald-600"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <KpiCard
            label="HV recibidas"
            value={totalHV}
            sub={rpFiltradas.length > 0 ? `~${(totalHV / rpFiltradas.length).toFixed(1)} por RP` : '—'}
            icon={Users}
            color="text-blue-600"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
          />
          <KpiCard
            label="RP cerradas"
            value={rpCerradas}
            sub={rpFiltradas.length > 0 ? `${Math.round((rpCerradas / rpFiltradas.length) * 100)}% del total` : '—'}
            icon={CheckCircle}
            color="text-amber-600"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
          />
          <KpiCard
            label="Tiempo prom. gestión"
            value={promediodiasGestion !== null ? `${promediodiasGestion} días` : '—'}
            sub="Desde GH recibida → cierre"
            icon={Clock}
            color="text-violet-600"
            iconBg="bg-violet-100 dark:bg-violet-900/30"
          />
        </div>

        {/* ── Indicador de carga de candidatos ────────────────────────────────── */}
        {loadingCandidatos && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Cargando datos de candidatos…
          </div>
        )}

        {/* ── Fila 1: Barras temporales + Pie estados ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfica de barras: HV por empresa temporal */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              <Text weight="bold" className="text-[var(--color-text-primary)]">
                HV por empresa temporal
              </Text>
            </div>
            {dataTemporales.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[var(--color-text-secondary)]">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <Text variant="caption">Sin datos de candidatos en este período</Text>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataTemporales} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="temporal"
                    tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="hv" name="HV recibidas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="contratados" name="Contratados" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="descartados" name="Descartados" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Gráfica de Pie: Distribución de estados */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-amber-500" />
              <Text weight="bold" className="text-[var(--color-text-primary)]">
                Estados de RP
              </Text>
            </div>
            {dataEstados.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[var(--color-text-secondary)]">
                <Text variant="caption">Sin RP en este período</Text>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={dataEstados}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {dataEstados.map((entry) => (
                        <Cell
                          key={entry.estado}
                          fill={ESTADO_COLOR_MAP[entry.estado] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {dataEstados.map((entry) => (
                    <div key={entry.estado} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Text as="span"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ESTADO_COLOR_MAP[entry.estado] ?? '#94a3b8' }} /* [CONTROLADO] */
                        />
                        <Text as="span" className="text-[var(--color-text-secondary)] truncate">{entry.name}</Text>
                      </div>
                      <Text as="span" className="font-bold text-[var(--color-text-primary)] ml-2">{entry.value}</Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Fila 2: Evolución mensual + Causales de descarte ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LineChart: Evolución mensual */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <Text weight="bold" className="text-[var(--color-text-primary)]">
                Evolución mensual de RP ({anioFiltro})
              </Text>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dataEvolucion} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="rp"
                  name="RP recibidas"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Causales de descarte */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <Text weight="bold" className="text-[var(--color-text-primary)]">
                Top causales de descarte
              </Text>
            </div>
            {dataCausales.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[var(--color-text-secondary)]">
                <Text variant="caption">Sin causales registradas</Text>
              </div>
            ) : (
              <div className="space-y-3">
                {dataCausales.map((row, i) => {
                  const max = dataCausales[0].count;
                  const pct = Math.round((row.count / max) * 100);
                  return (
                    <div key={row.causal}>
                      <div className="flex justify-between text-xs mb-1">
                        <Text as="span" className="text-[var(--color-text-secondary)] truncate max-w-[70%]" title={row.label}>{row.label}</Text>
                        <Text as="span" className="font-bold text-[var(--color-text-primary)]">{row.count}</Text>
                      </div>
                      <div className="w-full bg-[var(--color-border)] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ /* [CONTROLADO] */
                            width: `${pct}%`,
                            backgroundColor: COLORES_CHART[i % COLORES_CHART.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Top temporales ────────────────────────────────────────────────────── */}
        {dataTemporales.length > 0 && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-amber-500" />
              <Text weight="bold" className="text-[var(--color-text-primary)]">
                Ranking de empresas temporales
              </Text>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dataTemporales.slice(0, 6).map((t, i) => {
                const tasa = t.hv > 0 ? Math.round((t.contratados / t.hv) * 100) : 0;
                return (
                  <div key={t.temporal} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: COLORES_CHART[i % COLORES_CHART.length] }} /* [CONTROLADO] */
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{t.temporal}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {t.hv} HV · {t.contratados} contratados · {tasa}% éxito
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const root = document.getElementById('root') || document.body;
  return createPortal(content, root);
};

export default MetricasRPModal;
