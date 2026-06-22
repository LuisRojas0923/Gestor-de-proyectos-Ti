import type { FiltrosAuditoria } from '../../../types/auditoria';
import type { AuditoriaFilterKey } from '../components/auditoriaColumns';

const VACIO = '(Vacío)';

function valorFiltro(filter: Set<string>): string | undefined {
  if (filter.size !== 1) return undefined;
  const valor = Array.from(filter)[0];
  if (!valor || valor === VACIO) return undefined;
  return valor;
}

function fechaInicio(dia: string): string {
  return `${dia}T00:00:00`;
}

function fechaFin(dia: string): string {
  return `${dia}T23:59:59`;
}

export function filtrosDesdeColumnFilters(
  columnFilters: Record<string, Set<string>>
): Partial<FiltrosAuditoria> {
  const resultado: Partial<FiltrosAuditoria> = {};

  const fechaDesde = valorFiltro(columnFilters.fecha_desde ?? new Set());
  const fechaHasta = valorFiltro(columnFilters.fecha_hasta ?? new Set());
  if (fechaDesde) resultado.fecha_desde = fechaInicio(fechaDesde);
  if (fechaHasta) resultado.fecha_hasta = fechaFin(fechaHasta);

  const camposTexto: AuditoriaFilterKey[] = [
    'usuario_id',
    'usuario_nombre',
    'rol',
    'modulo',
    'accion',
    'entidad_tipo',
    'entidad_id',
    'metodo_http',
    'ruta',
    'direccion_ip',
    'resultado',
  ];

  camposTexto.forEach((campo) => {
    const valor = valorFiltro(columnFilters[campo] ?? new Set());
    if (valor) {
      (resultado as Record<string, string>)[campo] = valor;
    }
  });

  const codigo = valorFiltro(columnFilters.codigo_respuesta ?? new Set());
  if (codigo) {
    resultado.codigo_respuesta = Number(codigo);
  }

  return resultado;
}

export function columnFiltersDesdeFiltros(
  filtros: FiltrosAuditoria
): Record<string, Set<string>> {
  const toSet = (valor?: string | number) =>
    valor !== undefined && valor !== null && valor !== ''
      ? new Set([String(valor)])
      : new Set<string>();

  return {
    fecha_desde: filtros.fecha_desde ? new Set([filtros.fecha_desde.slice(0, 10)]) : new Set(),
    fecha_hasta: filtros.fecha_hasta ? new Set([filtros.fecha_hasta.slice(0, 10)]) : new Set(),
    usuario_id: toSet(filtros.usuario_id),
    usuario_nombre: toSet(filtros.usuario_nombre),
    rol: toSet(filtros.rol),
    modulo: toSet(filtros.modulo),
    accion: toSet(filtros.accion),
    entidad_tipo: toSet(filtros.entidad_tipo),
    entidad_id: toSet(filtros.entidad_id),
    metodo_http: toSet(filtros.metodo_http),
    ruta: toSet(filtros.ruta),
    codigo_respuesta: toSet(filtros.codigo_respuesta),
    direccion_ip: toSet(filtros.direccion_ip),
    resultado: toSet(filtros.resultado),
  };
}
