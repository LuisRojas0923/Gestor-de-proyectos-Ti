/**
 * TablaPlanificacion — Paso 3 del planificador.
 *
 * Matriz empleado × día (L-D) con celdas clickables que abren el editor.
 * Si recibe `preCalculo`, muestra el HE esperado por celda con código
 * de color (verde ≤0, ámbar ≤2h, rojo >2h).
 */
import React, { useMemo } from 'react';
import { Text, Badge, Checkbox, MaterialCard } from '../../../../../components/atoms';
import { Users } from 'lucide-react';
import { labelDia } from '../utils/horarioUtils';
import type {
  EmpleadoERPRead,
  PlanEmpleadoInBase,
  PlanPreCalculoResponse,
} from '../../../../../types/horasExtras';

export interface PlanEmpleadoTabla extends PlanEmpleadoInBase {
  empleado?: EmpleadoERPRead;
}

interface TablaPlanificacionProps {
  empleados: PlanEmpleadoTabla[];
  onCeldaClick: (cedula: string, diaSemana: number) => void;
  preCalculo?: PlanPreCalculoResponse | null;
  highlightedCedula?: string | null;
  seleccionados?: Set<string>;
  onToggleEmpleado?: (cedula: string) => void;
  errores?: Map<string, string>;
}

const colorHE = (he: number): string => {
  if (he <= 0) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
  if (he <= 2) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
};

const TablaPlanificacion: React.FC<TablaPlanificacionProps> = ({
  empleados,
  onCeldaClick,
  preCalculo,
  highlightedCedula,
  seleccionados,
  onToggleEmpleado,
  errores,
}) => {
  const idxPreCalculo = useMemo(() => {
    const dias = new Map<string, Map<number, number>>();
    const totales = new Map<string, { he: number; costo: number }>();
    if (!preCalculo) return { dias, totales };
    for (const e of preCalculo.empleados) {
      const inner = new Map<number, number>();
      for (const d of e.detalle_por_dia) {
        inner.set(d.dia_semana, d.horas_extras);
      }
      dias.set(e.cedula, inner);
      totales.set(e.cedula, {
        he: e.total_horas_extras,
        costo: e.total_costo_estimado,
      });
    }
    return { dias, totales };
  }, [preCalculo]);

  if (empleados.length === 0) {
    return (
      <MaterialCard className="p-8 text-center" role="status" aria-label="Planificador sin empleados seleccionados">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Users className="h-6 w-6" />
        </div>
        <Text className="font-semibold block">Empieza seleccionando empleados</Text>
        <Text className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Usa el botón Empleados para marcar empleados autorizados y volver con la selección al planificador.
        </Text>
      </MaterialCard>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-auto max-h-[620px] shadow-inner">
      <table className="w-full min-w-[1180px] text-sm border-collapse">
        <thead className="sticky top-0 z-20 bg-[var(--deep-navy)] text-white text-xs uppercase">
          <tr>
            {onToggleEmpleado && <th className="px-3 py-3 text-left w-12">Sel.</th>}
            <th className="px-3 py-3 text-left min-w-[240px]">Empleado</th>
            <th className="px-3 py-3 text-center min-w-[110px]">Autorización</th>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <th key={d} className="px-2 py-3 text-center min-w-[105px]">
                {labelDia(d)}
              </th>
            ))}
            <th className="px-3 py-3 text-center min-w-[90px]">Total HE</th>
            <th className="px-3 py-3 text-right min-w-[120px]">Costo</th>
            <th className="px-3 py-3 text-center min-w-[120px]">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {empleados.map((emp) => {
            const diasIdx = new Map(emp.dias.map((d) => [d.dia_semana, d]));
            const hePorDia = idxPreCalculo.dias.get(emp.cedula);
            const total = idxPreCalculo.totales.get(emp.cedula);
            const isHighlighted = highlightedCedula === emp.cedula;
            const error = errores?.get(emp.cedula);
            const esDuplicado = error?.includes('ya tiene un cálculo registrado') ?? false;
            return (
              <tr
                key={emp.cedula}
                className={`${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/10' : ''} hover:bg-[var(--color-surface-variant)] transition-colors`}
              >
                {onToggleEmpleado && (
                  <td className="px-3 py-3 align-middle">
                    <Checkbox
                      checked={seleccionados?.has(emp.cedula) ?? false}
                      onChange={() => onToggleEmpleado(emp.cedula)}
                      label=""
                      aria-label={`Seleccionar fila ${emp.cedula}`}
                    />
                  </td>
                )}
                <td className="px-3 py-3 align-middle whitespace-nowrap">
                  <Text className="font-semibold block">{emp.empleado?.nombre ?? emp.cedula}</Text>
                  <Text className="text-xs text-[var(--color-text-secondary)] block">
                    {emp.cedula} · {emp.empleado?.cargo ?? 'Cargo no disponible'} · {emp.empleado?.area ?? 'Area no disponible'}
                  </Text>
                  <Text className="text-xs text-[var(--color-text-secondary)] block">
                    Reporta a: {emp.empleado?.quien_reporta ?? 'No disponible'}
                  </Text>
                </td>
                <td className="px-3 py-3 text-center align-middle">
                  {emp.empleado?.autoriza_he === true ? (
                    <Badge size="xs" variant="success">Autoriza HE</Badge>
                  ) : emp.empleado?.autoriza_he === false ? (
                    <Badge size="xs" variant="warning">No autoriza</Badge>
                  ) : (
                    <Badge size="xs" variant="default">Sin dato</Badge>
                  )}
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
                        className={`w-full min-h-[58px] px-2 py-1 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.98] transition-all ${
                          hePorDia ? colorHE(he) : 'bg-[var(--color-surface)]'
                        }`}
                        aria-label={`Editar ${labelDia(ds)} de ${emp.cedula}`}
                      >
                        <div className="text-[10px] leading-tight font-semibold">
                          {dia?.hora_entrada?.slice(0, 5) ?? '—'}/
                          {dia?.hora_salida?.slice(0, 5) ?? '—'}
                        </div>
                        <div className="text-[10px] opacity-70">
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
                <td className="px-3 py-3 text-center align-middle">
                  <Text className="font-semibold">{total ? `${total.he.toFixed(1)}h` : '—'}</Text>
                </td>
                <td className="px-3 py-3 text-right align-middle">
                  <Text className="font-semibold">
                    {total ? `$${Math.round(total.costo).toLocaleString('es-CO')}` : '—'}
                  </Text>
                </td>
                <td className="px-3 py-3 text-center align-middle">
                  {esDuplicado ? (
                    <Badge size="xs" variant="warning">Ya existe</Badge>
                  ) : error ? (
                    <Badge size="xs" variant="error">Error</Badge>
                  ) : preCalculo ? (
                    <Badge size="xs" variant="success">Calculado</Badge>
                  ) : (
                    <Badge size="xs" variant="default">Pendiente</Badge>
                  )}
                  {error && (
                    <Text className={`text-[10px] mt-1 block ${esDuplicado ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-600 dark:text-red-300'}`}>
                      {error}
                    </Text>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPlanificacion;
