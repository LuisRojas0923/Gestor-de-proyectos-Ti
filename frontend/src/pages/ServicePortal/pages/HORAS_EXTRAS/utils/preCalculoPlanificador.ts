import type { PlanPreCalculoResponse } from '../../../../../types/horasExtrasPlanificador';
import type { CalculoDiaVisual } from '../components/empleadosActivosTableUtils';

export const indexarPreCalculo = (preCalculo?: PlanPreCalculoResponse | null) => {
  const dias = new Map<string, Map<number, CalculoDiaVisual>>();
  const totales = new Map<string, { he: number; costo: number }>();
  if (!preCalculo) return { dias, totales };
  for (const empleado of preCalculo.empleados) {
    const detalle = new Map<number, CalculoDiaVisual>();
    for (const dia of empleado.detalle_por_dia) {
      detalle.set(dia.dia_semana, {
        he: dia.horas_extras,
        codigos: (dia.conceptos ?? []).map((concepto) => concepto.codigo),
        festivo: dia.es_festivo,
      });
    }
    dias.set(empleado.cedula, detalle);
    totales.set(empleado.cedula, {
      he: empleado.total_horas_extras,
      costo: empleado.total_costo_estimado,
    });
  }
  return { dias, totales };
};
