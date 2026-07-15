import type { PlanDiaIn } from '../../../../../types/horasExtrasPlanificador';
import type { PlantillaHorario } from '../../../../../types/horariosRelaciones';
import { normalizarDiasPlan } from './planificadorSemanalUtils';

const horaCorta = (hora: string | null): string | null => hora?.slice(0, 5) ?? null;

export const crearOverridesDesdePlantilla = (
  plantilla: PlantillaHorario,
  seleccionados: Set<string>,
  overrides: Map<string, PlanDiaIn[]>,
  defaultDias: PlanDiaIn[],
): Map<string, PlanDiaIn[]> => {
  const plantillaPorDia = new Map(plantilla.dias.map((dia) => [dia.dia_semana, dia]));
  const next = new Map(overrides);

  seleccionados.forEach((cedula) => {
    const diasActuales = normalizarDiasPlan(next.get(cedula) ?? defaultDias);
    next.set(cedula, diasActuales.map((dia) => {
      const diaPlantilla = plantillaPorDia.get(dia.dia_semana);
      if (!diaPlantilla) return dia;
      return {
        ...dia,
        hora_entrada: horaCorta(diaPlantilla.hora_entrada),
        hora_salida: horaCorta(diaPlantilla.hora_salida),
        minutos_almuerzo: diaPlantilla.minutos_almuerzo,
        cruza_medianoche: diaPlantilla.cruza_medianoche,
      };
    }));
  });

  return next;
};

export const diasActivosDePlantilla = (plantilla: PlantillaHorario): Set<number> => new Set(
  plantilla.dias
    .filter((dia) => dia.hora_entrada !== null && dia.hora_salida !== null)
    .map((dia) => dia.dia_semana),
);
