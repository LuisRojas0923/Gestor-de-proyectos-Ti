export type MotivoNoDisponible =
  | 'EMPLEADO_INACTIVO'
  | 'NO_AUTORIZA_HE'
  | 'VACACIONES'
  | 'INCAPACIDAD'
  | 'LICENCIA';

export interface HorarioSemanalDia {
  dia_semana: number;
  hora_entrada: string | null;
  hora_salida: string | null;
  minutos_almuerzo: number;
  cruza_medianoche: boolean;
}

export interface PlantillaHorario {
  id: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  esta_activa: boolean;
  creado_en?: string;
  actualizado_en?: string;
  dias: HorarioSemanalDia[];
}

export interface PlantillaHorarioInput {
  nombre: string;
  descripcion?: string | null;
  dias: HorarioSemanalDia[];
}

export interface PlantillaHorarioUpdate extends Partial<PlantillaHorarioInput> {
  version_esperada: number;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListarPlantillasParams {
  q?: string;
  incluir_inactivas?: boolean;
  limit?: number;
  offset?: number;
}

export interface GestorAlcance {
  id: string;
  nombre: string;
  rol: string;
  relaciones_activas: number;
}

export interface EmpleadoErpAlcance {
  cedula: string;
  nombre: string | null;
  cargo: string | null;
  area: string | null;
  ciudadcontratacion: string | null;
  jefe: string | null;
  autoriza_he: boolean | null;
  disponible_semana: boolean;
  motivo_no_disponible: MotivoNoDisponible | null;
  relacionado?: boolean;
}

export type OrdenEmpleados = 'cedula' | 'nombre' | 'cargo' | 'area' | 'ciudad' | 'jefe';
export type DireccionOrden = 'asc' | 'desc';

export interface FiltrosEmpleadosErp {
  q?: string;
  anio: number;
  semana_iso: number;
  cargos?: string[];
  areas?: string[];
  ciudades?: string[];
  jefes?: string[];
  autoriza_he?: boolean;
  disponible_semana?: boolean;
  relacionado?: boolean;
  orden?: OrdenEmpleados;
  direccion?: DireccionOrden;
  limit: number;
  offset: number;
}

export interface FacetasEmpleados {
  cargos?: string[];
  areas?: string[];
  ciudades?: string[];
  jefes?: string[];
}

export interface PaginaEmpleadosErp extends Pagina<EmpleadoErpAlcance> {
  facetas: FacetasEmpleados;
}

export interface CambioRelacionesInput {
  solicitud_id: string;
  cedulas_agregar: string[];
  cedulas_quitar: string[];
}

export interface CambioRelacionesResultado {
  gestor_id: string;
  agregadas: number;
  reactivadas: number;
  desactivadas: number;
  sin_cambio: number;
  idempotente: boolean;
}

export interface AplicarPlantillaInput {
  solicitud_id: string;
  cedulas: string[];
}

export interface AplicarPlantillaResultado {
  aplicacion_id: string;
  plantilla_id: string;
  plantilla_version: number;
  cantidad_empleados: number;
  estado: string;
  idempotente: boolean;
}

export interface CapacidadesBiometria {
  puede_supervisar_equipo: boolean;
}

export interface AsistenciaBiometriaAdmin {
  id: number;
  usuario_id: string;
  empleado_cedula: string;
  empleado_nombre: string;
  zona_id: number | null;
  zona_nombre: string | null;
  resultado: boolean;
  creado_en: string | null;
}

export interface FiltrosAsistenciasBiometria {
  fecha_desde?: string;
  fecha_hasta?: string;
  usuario_id?: string;
  zona_id?: number;
  resultado?: boolean;
  limit: number;
  offset: number;
}
