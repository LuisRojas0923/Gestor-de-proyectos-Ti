import React from 'react';
import { Text } from '../../../../../components/atoms';

// Mapa de códigos de causal → nombre completo (debe estar sincronizado con DetalleSeguimientoRP.tsx)
export const CAUSALES_LABEL_MAP: Record<string, string> = {
  'N.C.EXP':           'No cumple experiencia / perfil técnico',
  'N.C. E.M':          'No aprobó exámenes médicos',
  'N.C. ENT':          'No aprobó entrevista con líder',
  'DESISTE_SALARIO':   'Desistió por aspiración salarial',
  'DESISTE_CONTRATO':  'Desistió por tipo de contrato/horario',
  'DESISTE_DISTANCIA': 'Desistió por ubicación/transporte',
  'DESISTE_PERSONAL':  'Desistió por motivos personales',
};

export const fmt = (d: string | null | undefined) => {
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
};

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const COLORES_CHART = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// Colores fijos por estado para el PieChart
export const ESTADO_COLOR_MAP: Record<string, string> = {
  APROBADA:              '#10b981', // emerald
  EN_PROCESO_SELECCION:  '#3b82f6', // blue
  CERRADA:               '#6366f1', // indigo
  CANCELADA:             '#ef4444', // red — rojo para cancelación
};

// ── KPI Card interna ──────────────────────────────────────────────────────────

export interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon: Icon, color, iconBg }) => (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div className="min-w-0">
      <Text variant="caption" className="block uppercase tracking-wider font-bold text-[var(--color-text-secondary)] truncate">
        {label}
      </Text>
      <div className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">{value}</div>
      {sub && <Text variant="caption" className="text-[var(--color-text-tertiary)]">{sub}</Text>}
    </div>
  </div>
);

// ── Tooltip personalizado ─────────────────────────────────────────────────────

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-xl text-sm">
      <div className="font-bold text-[var(--color-text-primary)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <Text as="span" className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} /> {/* [CONTROLADO] */}
          <Text as="span" className="text-[var(--color-text-secondary)]">{p.name}:</Text>
          <Text as="span" className="font-bold text-[var(--color-text-primary)]">{p.value}</Text>
        </div>
      ))}
    </div>
  );
};
