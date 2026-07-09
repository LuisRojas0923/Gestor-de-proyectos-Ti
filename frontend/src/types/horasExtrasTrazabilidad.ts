export type DetalleDiarioEstado = 'DISPONIBLE' | 'HISTORICO_SIN_SNAPSHOT' | 'INCOMPLETO';

export interface CalculoDiarioDetalle {
  id?: number;
  calculo_id?: number;
  cedula?: string;
  anio?: number;
  semana_iso?: number;
  fecha: string;
  dia_semana: number;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  minutos_almuerzo: number;
  horas_trabajadas: number;
  horas_ordinarias: number;
  horas_extras: number;
  codigo_calculado?: string | null;
  horas_concepto?: number | null;
  factor_hora_ordinaria?: number | null;
  valor_bruto: number;
  carga_prestacional: number;
  costo_total: number;
  es_festivo: boolean;
  nombre_festivo?: string | null;
  es_domingo: boolean;
  es_jornada_nocturna: boolean;
  novedad_codigo?: string | null;
  fuente_horario: string;
  ot_id?: number | null;
  ot_codigo?: string | null;
  observaciones?: string | null;
}
