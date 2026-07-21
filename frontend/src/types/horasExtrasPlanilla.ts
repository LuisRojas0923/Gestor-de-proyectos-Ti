export interface CalculoPlanilla {
  fila_id: string;
  calculo_id: number;
  cedula: string;
  empleado: string | null;
  salario: number;
  base_hora: number;
  aplica_he: boolean;
  empresa: string | null;
  sucursal: string | null;
  fecha: string;
  ot_cc: string | null;
  sub_subc: string | null;
  especialidad_ot: string | null;
  cantidad: number;
  ubicacion: string;
  novedad: string;
  cantidad_horas: number;
  observaciones: string | null;
  responsable: string | null;
  encargados: string | null;
  cliente: string | null;
  costo_total: number;
  estado: string;
}
