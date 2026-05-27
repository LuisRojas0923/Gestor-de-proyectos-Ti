import React from 'react';
import { BarChart3, TrendingUp, Users, ShieldAlert, Award } from 'lucide-react';
import { Title, Text, Badge } from '../../../../../components/atoms';
import type { RequisicionTemporal, CandidatoRequisicion } from '../types/requisicion.types';

interface Props {
  asignadas: RequisicionTemporal[];
  candidatos: CandidatoRequisicion[];
  vacantesRequeridas: number;
}

const CAUSALES_DISCARTE = [
  { value: 'N.C.EXP', label: 'No cumple experiencia / perfil' },
  { value: 'N.C. E.M', label: 'No aprobó exámenes médicos' },
  { value: 'N.C. ENT', label: 'No aprobó entrevista' },
  { value: 'DESISTE_SALARIO', label: 'Desistió por salario' },
  { value: 'DESISTE_CONTRATO', label: 'Desistió por contrato/horario' },
  { value: 'DESISTE_DISTANCIA', label: 'Desistió por ubicación' },
  { value: 'DESISTE_PERSONAL', label: 'Desistió por motivos personales' },
];

const AnalisisTemporales: React.FC<Props> = ({ asignadas, candidatos, vacantesRequeridas }) => {
  if (asignadas.length === 0) return null;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
        <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
        <div>
          <Title variant="h6" weight="bold" className="text-sm uppercase tracking-wider text-[var(--color-text-secondary)]">
            Análisis de Reclutamiento por Temporal
          </Title>
          <Text variant="caption" color="secondary" className="mt-0.5">
            Métricas de efectividad, volumen de hojas de vida y causales de descarte por cada agencia.
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {asignadas.map(a => {
          const candTemp = candidatos.filter(c => c.temporal_id === a.temporal_id);
          const totalHv = candTemp.length;
          const contratados = candTemp.filter(c => c.estado === 'CONTRATADO').length;
          const aplica = candTemp.filter(c => c.estado === 'APLICA').length;
          const porEvaluar = candTemp.filter(c => c.estado === 'POR_EVALUAR').length;
          const noAplica = candTemp.filter(c => c.estado === 'NO_APLICA').length;

          // Tasa de éxito / Efectividad
          const efectividad = totalHv > 0 ? (contratados / totalHv) * 100 : 0;

          // Agrupar causales de descarte
          const causales: Record<string, number> = {};
          candTemp.forEach(c => {
            if (c.estado === 'NO_APLICA' && c.causal_descarte) {
              causales[c.causal_descarte] = (causales[c.causal_descarte] || 0) + 1;
            }
          });

          return (
            <div 
              key={a.temporal_id} 
              className="border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/10 rounded-2xl p-5 flex flex-col justify-between hover:border-[var(--color-primary)]/30 transition-colors space-y-4"
            >
              {/* Header de la temporal */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Text className="font-bold text-base block text-[var(--color-text-primary)]">
                    {a.nombre_temporal}
                  </Text>
                  <Text variant="caption" color="secondary">
                    Fecha de Envío RP: {a.fecha_envio ? new Date(a.fecha_envio).toLocaleDateString('es-CO') : '—'}
                  </Text>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                    Tasa de Éxito
                  </span>
                  <Badge variant={efectividad > 50 ? 'emerald' : efectividad > 0 ? 'warning' : 'neutral'} className="mt-1 font-extrabold">
                    {efectividad.toFixed(0)}%
                  </Badge>
                </div>
              </div>

              {/* Indicadores de Volumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
                <div className="text-center border-r border-[var(--color-border)] last:border-0">
                  <span className="text-[10px] text-[var(--color-text-secondary)] block font-semibold">HVs Recibidas</span>
                  <span className="text-lg font-bold text-[var(--color-text-primary)]">{totalHv}</span>
                </div>
                <div className="text-center sm:border-r border-[var(--color-border)] last:border-0">
                  <span className="text-[10px] text-violet-600 block font-semibold">Contratados</span>
                  <span className="text-lg font-bold text-violet-700">{contratados}</span>
                </div>
                <div className="text-center border-r border-[var(--color-border)] last:border-0">
                  <span className="text-[10px] text-emerald-600 block font-semibold">En Proceso</span>
                  <span className="text-lg font-bold text-emerald-700">{aplica + porEvaluar}</span>
                </div>
                <div className="text-center last:border-0">
                  <span className="text-[10px] text-rose-600 block font-semibold">Descartados</span>
                  <span className="text-lg font-bold text-rose-700">{noAplica}</span>
                </div>
              </div>

              {/* Distribución de Causales de Descarte */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Motivos de Descarte</span>
                </div>
                {noAplica === 0 ? (
                  <div className="text-center py-4 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl">
                    <Text variant="caption" color="secondary" className="italic">
                      No se registran descartes para esta temporal.
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 max-h-[160px] overflow-y-auto">
                    {Object.entries(causales).map(([causal, count]) => {
                      const labelObj = CAUSALES_DISCARTE.find(c => c.value === causal);
                      const desc = labelObj ? labelObj.label : causal;
                      const percentage = (count / noAplica) * 100;

                      return (
                        <div key={causal} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="truncate max-w-[80%] text-[var(--color-text-primary)]">{desc}</span>
                            <span className="text-[var(--color-text-secondary)] font-bold">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-[var(--color-surface-secondary)] rounded-full h-1.5 overflow-hidden">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalisisTemporales;
