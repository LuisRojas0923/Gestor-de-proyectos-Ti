/**
 * TablaPlanificacion — Paso 3 del planificador.
 *
 * Matriz empleado × día (L-D) con celdas clickables que abren el editor.
 * Si recibe `preCalculo`, muestra el HE esperado por celda con código
 * de color (verde ≤0, ámbar ≤2h, rojo >2h).
 */
import React, { useMemo } from 'react';
import { Text, Badge } from '../../../../../components/atoms';
import { labelDia } from '../utils/horarioUtils';
import type {
  PlanEmpleadoInBase,
  PlanPreCalculoResponse,
} from '../../../../../types/horasExtras';

interface TablaPlanificacionProps {
  empleados: PlanEmpleadoInBase[];
  onCeldaClick: (cedula: string, diaSemana: number) => void;
  preCalculo?: PlanPreCalculoResponse | null;
  highlightedCedula?: string | null;
}

const colorHE = (he: number): string => {
  if (he <= 0) return 'bg-emerald-50 text-emerald-700';
  if (he <= 2) return 'bg-amber-50 text-amber-800';
  return 'bg-rose-50 text-rose-700';
};

const TablaPlanificacion: React.FC<TablaPlanificacionProps> = ({
  empleados,
  onCeldaClick,
  preCalculo,
  highlightedCedula,
}) => {
  const idxPreCalculo = useMemo(() => {
    const m = new Map<string, Map<number, number>>();
    if (!preCalculo) return m;
    for (const e of preCalculo.empleados) {
      const inner = new Map<number, number>();
      for (const d of e.detalle_por_dia) {
        inner.set(d.dia_semana, d.horas_extras);
      }
      m.set(e.cedula, inner);
    }
    return m;
  }, [preCalculo]);

  if (empleados.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-white text-center text-sm text-slate-500">
        No hay empleados seleccionados. Ve al Paso 1.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Cédula</th>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <th key={d} className="px-2 py-2 text-center">
                {labelDia(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {empleados.map((emp) => {
            const diasIdx = new Map(emp.dias.map((d) => [d.dia_semana, d]));
            const hePorDia = idxPreCalculo.get(emp.cedula);
            const isHighlighted = highlightedCedula === emp.cedula;
            return (
              <tr
                key={emp.cedula}
                className={isHighlighted ? 'bg-amber-50' : ''}
              >
                <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                  {emp.cedula}
                </td>
                {[1, 2, 3, 4, 5, 6, 7].map((ds) => {
                  const dia = diasIdx.get(ds);
                  const he = hePorDia?.get(ds) ?? 0;
                  return (
                    <td
                      key={ds}
                      className="px-1 py-1 text-center"
                    >
                      {/* @audit-ok: celda-boton con layout custom (entrada/salida/almuerzo/badge/HE) que el atomo Button no soporta */}
                      <button /* @audit-ok */
                        type="button"
                        onClick={() => onCeldaClick(emp.cedula, ds)}
                        className={`w-full px-2 py-1 rounded border border-slate-200 hover:border-slate-400 transition-colors ${
                          hePorDia ? colorHE(he) : 'bg-white'
                        }`}
                        aria-label={`Editar ${labelDia(ds)} de ${emp.cedula}`}
                      >
                        <div className="text-[10px] leading-tight">
                          {dia?.hora_entrada?.slice(0, 5) ?? '—'}/
                          {dia?.hora_salida?.slice(0, 5) ?? '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {dia?.minutos_almuerzo ?? 0}m
                        </div>
                        {dia && dia.novedades.length > 0 && (
                          <Badge className="!text-[9px] !px-1 !py-0 mt-0.5">
                            {dia.novedades[0].codigo_novedad}
                          </Badge>
                        )}
                        {hePorDia && he > 0 && (
                          <div className="text-[10px] font-semibold mt-0.5">
                            +{he.toFixed(1)}h
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPlanificacion;
