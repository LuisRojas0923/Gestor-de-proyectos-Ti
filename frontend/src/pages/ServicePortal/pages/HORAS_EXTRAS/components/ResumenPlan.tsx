/**
 * ResumenPlan — Panel agregado del plan (HE total, costo estimado).
 *
 * Muestra los totales por empleado y el gran total del plan actual.
 * Diferencia visual entre pre-cálculo (gris) y confirmado (verde).
 */
import React from 'react';
import { MaterialCard, Text } from '../../../../../components/atoms';
import type { PlanPreCalculoResponse } from '../../../../../types/horasExtrasPlanificador';

interface ResumenPlanProps {
  preCalculo: PlanPreCalculoResponse | null;
  confirmado?: { ok: number; error: number; he: number; hf: number; costo: number } | null;
}

const fmtCOP = (n: number): string =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const ResumenPlan: React.FC<ResumenPlanProps> = ({ preCalculo, confirmado }) => {
  if (!preCalculo && !confirmado) return null;

  return (
    <MaterialCard className="p-5">
      <Text className="font-semibold mb-3 block">Resumen del plan</Text>

      {preCalculo && (
        <div className="mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary)]/5 p-4">
          <Text className="text-xs text-[var(--color-text-secondary)] mb-2">Pre-cálculo en vivo, sin persistir</Text>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Empleados</Text>
              <Text className="text-lg font-semibold">{preCalculo.resumen.empleados_count}</Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Total HE</Text>
              <Text className="text-lg font-semibold">
                {preCalculo.resumen.total_horas_extras.toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Horas festivas</Text>
              <Text className="text-lg font-semibold">{preCalculo.resumen.total_horas_festivas.toFixed(1)}h</Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Costo estimado</Text>
              <Text className="text-lg font-semibold">
                {fmtCOP(preCalculo.resumen.total_costo_estimado)}
              </Text>
            </div>
          </div>
        </div>
      )}

      {confirmado && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-light)]/40 p-4">
          <Text className="text-xs text-[var(--color-primary)] mb-2">Confirmado y persistente</Text>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">OK</Text>
              <Text className="text-lg font-semibold text-[var(--color-primary)]">
                {confirmado.ok}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Errores</Text>
              <Text className="text-lg font-semibold text-[var(--color-primary)]">
                {confirmado.error}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Total HE</Text>
              <Text className="text-lg font-semibold text-[var(--color-primary)]">
                {confirmado.he.toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Horas festivas</Text>
              <Text className="text-lg font-semibold text-[var(--color-primary)]">
                {confirmado.hf.toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)]">Costo total</Text>
              <Text className="text-lg font-semibold text-[var(--color-primary)]">
                {fmtCOP(confirmado.costo)}
              </Text>
            </div>
          </div>
        </div>
      )}
    </MaterialCard>
  );
};

export default ResumenPlan;
