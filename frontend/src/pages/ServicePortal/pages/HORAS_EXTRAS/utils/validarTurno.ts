export interface TurnoValidable {
  hora_entrada: string | null;
  hora_salida: string | null;
  minutos_almuerzo: number;
  cruza_medianoche: boolean;
}

const minutos = (hora: string): number => {
  const [horas, mins] = hora.split(':').map(Number);
  return horas * 60 + mins;
};

export const errorTurno = (turno: TurnoValidable): string | null => {
  const tieneEntrada = !!turno.hora_entrada;
  const tieneSalida = !!turno.hora_salida;
  if (tieneEntrada !== tieneSalida) return 'La entrada y la salida deben diligenciarse juntas.';
  if (!tieneEntrada || !tieneSalida) {
    return turno.minutos_almuerzo === 0 && !turno.cruza_medianoche
      ? null
      : 'Un día franco no puede tener almuerzo ni cruce de medianoche.';
  }
  if (turno.hora_entrada === turno.hora_salida) return 'La entrada y la salida no pueden ser iguales.';
  const entrada = minutos(turno.hora_entrada!);
  let salida = minutos(turno.hora_salida!);
  if (turno.cruza_medianoche) {
    if (salida >= entrada) return 'El cruce de medianoche requiere una salida anterior a la entrada.';
    salida += 24 * 60;
  } else if (salida <= entrada) {
    return 'Activa el cruce de medianoche cuando la salida sea al día siguiente.';
  }
  const duracion = salida - entrada - turno.minutos_almuerzo;
  return duracion > 0 && duracion < 24 * 60 ? null : 'La jornada efectiva debe ser mayor que cero y menor de 24 horas.';
};
