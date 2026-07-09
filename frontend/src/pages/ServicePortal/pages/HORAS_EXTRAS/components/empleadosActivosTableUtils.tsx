import React from 'react';
import { Text } from '../../../../../components/atoms';
import type { EmpleadoERPRead, PlanDiaIn } from '../../../../../types/horasExtrasPlanificador';

export const LIMITE_PAGINA = 25;
export const COLUMNAS_FILTRABLES = ['nombre', 'cedula', 'cargo', 'area', 'ciudadcontratacion', 'quien_reporta', 'autoriza_he', 'estado_he'];

export interface EmpleadoTablaRow extends EmpleadoERPRead {
  seleccionadoEnPlan: boolean;
  puedeSeleccionarse: boolean;
  diasPlan: PlanDiaIn[];
  hePorDia: Map<number, number> | undefined;
  totalPlan: { he: number; costo: number } | undefined;
  errorPlan: string | undefined;
  calculadoPlan: boolean;
}

export interface EmpleadoTablaRowCacheEntry {
  empleado: EmpleadoERPRead;
  seleccionadoEnPlan: boolean;
  puedeSeleccionarse: boolean;
  diasPlan: PlanDiaIn[];
  hePorDia: Map<number, number> | undefined;
  totalPlan: { he: number; costo: number } | undefined;
  errorPlan: string | undefined;
  calculadoPlan: boolean;
  row: EmpleadoTablaRow;
}

export const deduplicarEmpleados = (empleados: EmpleadoERPRead[]): EmpleadoERPRead[] => {
  const porCedula = new Map<string, EmpleadoERPRead>();
  empleados.forEach((empleado) => {
    const cedula = empleado.cedula.trim();
    if (!porCedula.has(cedula)) porCedula.set(cedula, { ...empleado, cedula });
  });
  return Array.from(porCedula.values());
};

export const empleadoValorColumna = (empleado: EmpleadoERPRead, key: string): string => {
  if (key === 'autoriza_he') {
    if (empleado.autoriza_he === true) return 'SI';
    if (empleado.autoriza_he === false) return 'NO';
    return 'Sin dato';
  }
  if (key === 'estado_he') return empleado.autoriza_he === true ? 'Disponible' : 'No disponible para HE';
  const valor = empleado[key as keyof EmpleadoERPRead];
  return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
};

export const colorHE = (he: number): string => {
  if (he <= 0) return 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300';
  if (he <= 2) return 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-950/40 dark:text-sky-100';
  return 'border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-700/70 dark:bg-indigo-950/45 dark:text-indigo-100';
};

export const FilaDatoCompacta: React.FC<{ etiqueta: string; valor: string; mono?: boolean }> = ({ etiqueta, valor, mono }) => (
  <div className="flex min-w-0 items-center gap-1 truncate !text-[10px]" title={`${etiqueta}: ${valor}`}>
    <Text variant="caption" className="w-[52px] shrink-0 font-semibold !text-[10px] leading-tight text-[var(--color-text-secondary)]">
      {etiqueta}:
    </Text>
    <Text
      variant="caption"
      weight="bold"
      className={`truncate !text-[10px] leading-tight ${mono ? 'font-mono text-[var(--color-primary)]' : ''}`}
    >
      {valor}
    </Text>
  </div>
);
