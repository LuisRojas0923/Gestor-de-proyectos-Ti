import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  Calculator,
  Clock3,
  ListChecks,
  ScanFace,
  Settings,
  Users,
  WalletCards,
} from 'lucide-react';

export type SeccionTiempoAsistencia = 'asistencia' | 'planificacion' | 'horas_extras' | 'administracion';

export interface OpcionTiempoAsistencia {
  id: string;
  seccion: SeccionTiempoAsistencia;
  titulo: string;
  descripcion: string;
  ruta: string;
  permiso: string;
  icono: LucideIcon;
  moduloEstado?: string;
}

export const SECCIONES_TIEMPO_ASISTENCIA: ReadonlyArray<{
  id: SeccionTiempoAsistencia;
  titulo: string;
  descripcion: string;
}> = [
  { id: 'asistencia', titulo: 'Asistencia', descripcion: 'Registro y consulta de asistencia biométrica.' },
  { id: 'planificacion', titulo: 'Planificación de horarios', descripcion: 'Organiza jornadas, equipos y disponibilidad semanal.' },
  { id: 'horas_extras', titulo: 'Horas extras', descripcion: 'Simula casos individuales o procesa semanas completas.' },
  { id: 'administracion', titulo: 'Administración', descripcion: 'Configura reglas, festivos y alcance operativo.' },
];

export const OPCIONES_TIEMPO_ASISTENCIA: ReadonlyArray<OpcionTiempoAsistencia> = [
  { id: 'biometria', seccion: 'asistencia', titulo: 'Biometría y asistencia', descripcion: 'Registra tu asistencia y consulta la información habilitada para tu equipo.', ruta: '/service-portal/biometria', permiso: 'biometria', icono: ScanFace },
  { id: 'planificador', seccion: 'planificacion', titulo: 'Planificador semanal', descripcion: 'Prepara horarios, novedades y órdenes de trabajo por semana.', ruta: '/service-portal/horas-extras/planificador', permiso: 'nomina_horas_extras.planificar', icono: CalendarCheck, moduloEstado: 'nomina_horas_extras' },
  { id: 'horario', seccion: 'planificacion', titulo: 'Horario semanal', descripcion: 'Consulta y edita la jornada semanal de un empleado.', ruta: '/service-portal/horas-extras/horario', permiso: 'nomina_horas_extras.planificar', icono: Clock3, moduloEstado: 'nomina_horas_extras' },
  { id: 'plantillas', seccion: 'planificacion', titulo: 'Plantillas de horario', descripcion: 'Diseña y aplica jornadas semanales reutilizables.', ruta: '/service-portal/horas-extras/plantillas', permiso: 'nomina_horas_extras.plantillas_horario.administrar', icono: CalendarClock },
  { id: 'pre-liquidacion', seccion: 'horas_extras', titulo: 'Calculadora individual de horas extras', descripcion: 'Simula horas y costos de un empleado antes de confirmar su liquidación.', ruta: '/service-portal/horas-extras/pre-liquidacion', permiso: 'nomina_horas_extras.planificar', icono: Banknote, moduloEstado: 'nomina_horas_extras' },
  { id: 'calculos', seccion: 'horas_extras', titulo: 'Cálculos', descripcion: 'Consulta cálculos procesados y su trazabilidad diaria.', ruta: '/service-portal/horas-extras/calculos', permiso: 'nomina_horas_extras.leer', icono: Calculator, moduloEstado: 'nomina_horas_extras' },
  { id: 'bolsa', seccion: 'horas_extras', titulo: 'Bolsa de horas', descripcion: 'Consulta saldos, movimientos y compensaciones registradas.', ruta: '/service-portal/horas-extras/bolsa', permiso: 'nomina_horas_extras.leer', icono: WalletCards, moduloEstado: 'nomina_horas_extras' },
  { id: 'costos-ot', seccion: 'horas_extras', titulo: 'Costos por OT', descripcion: 'Revisa el costo de horas extras asociado a órdenes de trabajo.', ruta: '/service-portal/horas-extras/costos-ot', permiso: 'nomina_horas_extras.leer', icono: BriefcaseBusiness, moduloEstado: 'nomina_horas_extras' },
  { id: 'festivos', seccion: 'administracion', titulo: 'Festivos', descripcion: 'Consulta el calendario usado por las reglas de liquidación.', ruta: '/service-portal/horas-extras/festivos', permiso: 'nomina_horas_extras.leer', icono: ListChecks, moduloEstado: 'nomina_horas_extras' },
  { id: 'configuracion', seccion: 'administracion', titulo: 'Configuración de horas extras', descripcion: 'Administra parámetros legales y operativos del módulo.', ruta: '/service-portal/horas-extras/configuracion', permiso: 'nomina_horas_extras.admin', icono: Settings, moduloEstado: 'nomina_horas_extras' },
  { id: 'alcance', seccion: 'administracion', titulo: 'Alcance de empleados', descripcion: 'Relaciona gestores del portal con empleados ERP.', ruta: '/service-portal/alcance-empleados', permiso: 'alcance_empleados.administrar', icono: Users },
];

export const obtenerOpcionesTiempoAsistencia = (
  permisos: readonly string[] | undefined,
  estadosModulos: Readonly<Record<string, boolean>> = {},
): OpcionTiempoAsistencia[] => {
  const permisosActivos = new Set(permisos ?? []);
  return OPCIONES_TIEMPO_ASISTENCIA.filter((opcion) =>
    permisosActivos.has(opcion.permiso)
    && (!opcion.moduloEstado || estadosModulos[opcion.moduloEstado] !== false),
  );
};

export const ALIAS_TIEMPO_ASISTENCIA = [
  'biometría',
  'asistencia',
  'horarios',
  'horas extras',
  'plantillas',
  'alcance',
].join(' ');
