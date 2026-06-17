/**
 * ResumenPlan — Panel agregado del plan (HE total, costo estimado).
 *
 * Muestra los totales por empleado y el gran total del plan actual.
 * Diferencia visual entre pre-cálculo (gris) y confirmado (verde).
 */
import React from 'react';
import { Text } from '../../../../../components/atoms';
import type { PlanPreCalculoResponse } from '../../../../../types/horasExtras';

interface ResumenPlanProps {
  preCalculo: PlanPreCalculoResponse | null;
  confirmado?: { ok: number; error: number; he: number; costo: number } | null;
}

const fmtCOP = (n: number): string =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const ResumenPlan: React.FC<ResumenPlanProps> = ({ preCalculo, confirmado }) => {
  if (!preCalculo && !confirmado) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-sm text-slate-500">
        Sin cálculo aún. Pulsa "Pre-calcular" para obtener el estimado en vivo.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <Text className="font-semibold mb-2">Resumen del plan</Text>

      {preCalculo && (
        <div className="mb-3 p-3 rounded bg-slate-50">
          <Text className="text-xs text-slate-500 mb-1">Pre-cálculo (en vivo, sin persistir)</Text>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Text className="text-xs text-slate-500">Empleados</Text>
              <Text className="text-lg font-semibold">{preCalculo.resumen.empleados_count}</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Total HE</Text>
              <Text className="text-lg font-semibold">
                {preCalculo.resumen.total_horas_extras.toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Costo estimado</Text>
              <Text className="text-lg font-semibold">
                {fmtCOP(preCalculo.resumen.total_costo_estimado)}
              </Text>
            </div>
          </div>
        </div>
      )}

      {confirmado && (
        <div className="p-3 rounded bg-emerald-50">
          <Text className="text-xs text-emerald-700 mb-1">Confirmado (persistente)</Text>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Text className="text-xs text-emerald-700">OK</Text>
              <Text className="text-lg font-semibold text-emerald-800">
                {confirmado.ok}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-emerald-700">Errores</Text>
              <Text className="text-lg font-semibold text-emerald-800">
                {confirmado.error}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-emerald-700">Total HE</Text>
              <Text className="text-lg font-semibold text-emerald-800">
                {confirmado.he.toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text className="text-xs text-emerald-700">Costo total</Text>
              <Text className="text-lg font-semibold text-emerald-800">
                {fmtCOP(confirmado.costo)}
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumenPlan;
