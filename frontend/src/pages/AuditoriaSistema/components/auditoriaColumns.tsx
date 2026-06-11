import { Badge, Text } from '../../../components/atoms';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import type { AuditoriaEvento } from '../../../types/auditoria';

export const ACCIONES_OPCIONES = [
  'crear', 'actualizar', 'eliminar', 'consultar', 'exportar', 'login', 'logout', 'otro',
];
export const RESULTADOS_OPCIONES = ['exito', 'fallo', 'denegado'];
export const METODOS_HTTP_OPCIONES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const resultadoVariant = (resultado: string) => {
  if (resultado === 'exito') return 'success';
  if (resultado === 'denegado') return 'warning';
  return 'error';
};

const vacio = (valor: string | null | undefined) => valor ?? '(Vacío)';

export const AUDITORIA_FILTER_KEYS = [
  'fecha_desde',
  'fecha_hasta',
  'usuario_id',
  'usuario_nombre',
  'rol',
  'modulo',
  'accion',
  'entidad_tipo',
  'entidad_id',
  'metodo_http',
  'ruta',
  'codigo_respuesta',
  'direccion_ip',
  'resultado',
] as const;

export type AuditoriaFilterKey = (typeof AUDITORIA_FILTER_KEYS)[number];

export function getAuditoriaColumnAccessors(): Record<string, (row: AuditoriaEvento) => string> {
  return {
    fecha: (row) => (row.timestamp ? row.timestamp.slice(0, 19) : '(Vacío)'),
    fecha_desde: (row) => (row.timestamp ? row.timestamp.slice(0, 10) : '(Vacío)'),
    fecha_hasta: (row) => (row.timestamp ? row.timestamp.slice(0, 10) : '(Vacío)'),
    usuario: (row) => vacio(row.usuario_nombre ?? row.usuario_id),
    usuario_id: (row) => vacio(row.usuario_id),
    usuario_nombre: (row) => vacio(row.usuario_nombre),
    entidad: (row) => `${vacio(row.entidad_tipo)} ${vacio(row.entidad_id)}`.trim(),
    rol: (row) => vacio(row.rol),
    modulo: (row) => row.modulo,
    accion: (row) => row.accion,
    entidad_tipo: (row) => vacio(row.entidad_tipo),
    entidad_id: (row) => vacio(row.entidad_id),
    metodo_http: (row) => vacio(row.metodo_http),
    ruta: (row) => vacio(row.ruta),
    codigo_respuesta: (row) => (row.codigo_respuesta != null ? String(row.codigo_respuesta) : '(Vacío)'),
    direccion_ip: (row) => vacio(row.direccion_ip),
    resultado: (row) => row.resultado,
  };
}

export function getAuditoriaColumns(): DataTableColumn<AuditoriaEvento>[] {
  return [
    {
      key: 'fecha',
      label: 'Fecha',
      minWidth: '150px',
      filterable: true,
      subFilters: [
        { key: 'fecha_desde', label: 'Desde' },
        { key: 'fecha_hasta', label: 'Hasta' },
      ],
      render: (row) => (
        <Text variant="caption" className="whitespace-nowrap font-mono">
          {row.timestamp?.slice(0, 19).replace('T', ' ') ?? '—'}
        </Text>
      ),
    },
    {
      key: 'usuario',
      label: 'Usuario',
      minWidth: '160px',
      filterable: true,
      subFilters: [
        { key: 'usuario_id', label: 'ID' },
        { key: 'usuario_nombre', label: 'Nombre' },
      ],
      render: (row) => (
        <div className="min-w-0">
          <Text variant="caption" weight="medium" className="truncate block">
            {row.usuario_nombre ?? row.usuario_id}
          </Text>
          <Text variant="caption" className="truncate text-neutral-500 !text-[10px] font-mono">
            {row.usuario_id}
          </Text>
        </div>
      ),
    },
    {
      key: 'rol',
      label: 'Rol',
      minWidth: '90px',
      filterable: true,
      render: (row) => (
        <Text variant="caption" weight="bold" className="uppercase !text-[10px]">
          {row.rol ?? '—'}
        </Text>
      ),
    },
    {
      key: 'modulo',
      label: 'Módulo',
      minWidth: '100px',
      filterable: true,
      render: (row) => (
        <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[10px]">
          {row.modulo}
        </Text>
      ),
    },
    {
      key: 'accion',
      label: 'Acción',
      minWidth: '95px',
      filterable: true,
      render: (row) => (
        <Text variant="caption" className="capitalize">{row.accion}</Text>
      ),
    },
    {
      key: 'entidad',
      label: 'Entidad',
      minWidth: '140px',
      filterable: true,
      subFilters: [
        { key: 'entidad_tipo', label: 'Tipo' },
        { key: 'entidad_id', label: 'ID' },
      ],
      render: (row) => (
        <Text variant="caption" className="truncate">
          {row.entidad_tipo ?? '—'} {row.entidad_id ?? ''}
        </Text>
      ),
    },
    {
      key: 'metodo_http',
      label: 'Método',
      minWidth: '75px',
      centered: true,
      filterable: true,
      render: (row) => (
        <Text variant="caption" weight="bold" className="font-mono !text-[10px]">
          {row.metodo_http ?? '—'}
        </Text>
      ),
    },
    {
      key: 'ruta',
      label: 'Ruta',
      minWidth: '180px',
      flex: true,
      filterable: true,
      render: (row) => (
        <Text variant="caption" className="truncate text-neutral-500" title={row.ruta ?? undefined}>
          {row.ruta ?? '—'}
        </Text>
      ),
    },
    {
      key: 'codigo_respuesta',
      label: 'HTTP',
      minWidth: '65px',
      centered: true,
      filterable: true,
      render: (row) => (
        <Text variant="caption" weight="bold" className="font-mono">
          {row.codigo_respuesta ?? '—'}
        </Text>
      ),
    },
    {
      key: 'direccion_ip',
      label: 'IP',
      minWidth: '110px',
      filterable: true,
      render: (row) => (
        <Text variant="caption" className="font-mono !text-[10px]">
          {row.direccion_ip ?? '—'}
        </Text>
      ),
    },
    {
      key: 'resultado',
      label: 'Resultado',
      minWidth: '95px',
      centered: true,
      filterable: true,
      render: (row) => (
        <Badge variant={resultadoVariant(row.resultado)} size="sm">
          {row.resultado}
        </Badge>
      ),
    },
  ];
}

export function buildAuditoriaColumnOptions(
  eventos: AuditoriaEvento[],
  cascadingOptions: Record<string, string[]>
): Record<string, string[]> {
  return {
    ...cascadingOptions,
    accion: ACCIONES_OPCIONES,
    resultado: RESULTADOS_OPCIONES,
    metodo_http: METODOS_HTTP_OPCIONES,
    codigo_respuesta: Array.from(
      new Set(eventos.map((e) => (e.codigo_respuesta != null ? String(e.codigo_respuesta) : '(Vacío)')))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  };
}
