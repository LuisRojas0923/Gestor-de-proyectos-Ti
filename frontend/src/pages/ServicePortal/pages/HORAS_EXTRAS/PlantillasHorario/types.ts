export type {
  AplicarPlantillaResultado,
  HorarioSemanalDia,
  PlantillaHorario,
  PlantillaHorarioInput,
  PlantillaHorarioUpdate,
} from '../../../../../types/horariosRelaciones';

export const semanaHorarioVacia = () => Array.from({ length: 7 }, (_, index) => ({
  dia_semana: index + 1,
  hora_entrada: index < 5 ? '07:30' : null,
  hora_salida: index < 5 ? '17:00' : null,
  minutos_almuerzo: index < 5 ? 30 : 0,
  cruza_medianoche: false,
}));
