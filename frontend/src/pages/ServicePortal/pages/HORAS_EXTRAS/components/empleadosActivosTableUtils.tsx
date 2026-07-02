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
  if (he <= 0) return 'bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]';
  if (he <= 2) return 'bg-[var(--color-primary-light)]/30 text-[var(--color-primary)]';
  return 'bg-[var(--color-primary)] text-[var(--color-surface)]';
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
