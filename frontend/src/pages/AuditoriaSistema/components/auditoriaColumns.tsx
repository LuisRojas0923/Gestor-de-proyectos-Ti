import { Badge, Text } from '../../../components/atoms';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import type { AuditoriaEvento, ResultadoAuditoria } from '../../../types/auditoria';
import {
  humanizarModulo,
  humanizarAccionDetallada,
  humanizarResultado,
} from '../../ServicePortal/pages/AuditoriaIndicadores/utils/humanizer';

export const ACCIONES_OPCIONES = [
  'crear', 'actualizar', 'eliminar', 'consultar', 'exportar', 'login', 'logout', 'otro',
];
export const RESULTADOS_OPCIONES = ['exito', 'fallo', 'denegado'];
export const METODOS_HTTP_OPCIONES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

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

// ----------------------------------------------------------------------
// Helpers visuales (similares a UltimosEventosTable)
// ----------------------------------------------------------------------

const getResultColor = (resultado: string) => {
  switch (resultado) {
    case 'exito': return 'success';
    case 'fallo': return 'warning';
    case 'denegado': return 'error';
    default: return 'default';
  }
};

type Severidad = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

const calcularSeveridad = (row: AuditoriaEvento): Severidad => {
  const acc = (row.accion || '').toLowerCase();
  const code = row.codigo_respuesta || 200;

  const esConsultaTercero =
    row.modulo === 'viaticos' &&
    row.metadatos?.cedula_consultada &&
    row.usuario_id &&
    !row.usuario_id.includes(row.metadatos.cedula_consultada);

  if (esConsultaTercero) return 'Medio';

  if (row.resultado === 'exito' || (code >= 200 && code < 300)) {
    if (
      acc.includes('eliminar') ||
      acc.includes('delete') ||
      row.metodo_http === 'DELETE' ||
      acc.includes('permisos') ||
      acc.includes('rol')
    ) {
      return 'Medio';
    }
    return 'Bajo';
  }

  if (code >= 500) return 'Crítico';
  if (row.resultado === 'denegado' || code === 403 || code === 401) return 'Alto';
  return 'Medio';
};

const getSeveridadColor = (sev: Severidad) => {
  switch (sev) {
    case 'Crítico': return 'error';
    case 'Alto': return 'warning';
    case 'Medio': return 'info';
    case 'Bajo': return 'success';
  }
};

const getSeveridadDetalle = (sev: Severidad) => {
  switch (sev) {
    case 'Crítico': return { significado: 'Posible incidente', accion: 'Escalar' };
    case 'Alto': return { significado: 'Riesgo operativo o seguridad', accion: 'Revisar inmediatamente' };
    case 'Medio': return { significado: 'Requiere revisión', accion: 'Validar causa' };
    case 'Bajo': default: return { significado: 'Comportamiento normal', accion: 'Sin acción' };
  }
};

const parseUserAgent = (ua: string | undefined | null): string => {
  if (!ua) return 'Desconocido';
  const uaLower = ua.toLowerCase();

  let browser = 'Desconocido';
  if (uaLower.includes('edg/')) browser = 'Edge';
  else if (uaLower.includes('opr/') || uaLower.includes('opera')) browser = 'Opera';
  else if (uaLower.includes('chrome')) browser = 'Chrome';
  else if (uaLower.includes('firefox')) browser = 'Firefox';
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari';
  else if (uaLower.includes('postman')) browser = 'Postman';
  else if (uaLower.includes('insomnia')) browser = 'Insomnia';
  else if (uaLower.includes('python')) browser = 'Python / Script';

  let os = '';
  if (uaLower.includes('windows')) os = 'Windows';
  else if (uaLower.includes('mac os')) os = 'macOS';
  else if (uaLower.includes('linux')) os = 'Linux';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS';

  if (browser !== 'Desconocido' && os) return `${browser} (${os})`;
  if (browser !== 'Desconocido') return browser;
  if (os) return os;
  return ua.split(' ')[0] || 'Desconocido';
};


// ----------------------------------------------------------------------
// Definición de Columnas Rica
// ----------------------------------------------------------------------

export function getAuditoriaColumns(): DataTableColumn<AuditoriaEvento>[] {
  return [
    {
      key: 'fecha',
      label: 'Fecha y Hora',
      minWidth: '150px',
      filterable: true,
      subFilters: [
        { key: 'fecha_desde', label: 'Desde' },
        { key: 'fecha_hasta', label: 'Hasta' },
      ],
      render: (row) => (
        <Text variant="caption" className="whitespace-nowrap font-mono">
          {row.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A'}
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
        { key: 'rol', label: 'Rol' },
      ],
      render: (row) => (
        <div className="flex flex-col min-w-0">
          <Text variant="body2" className="font-medium text-[var(--color-text-primary)] truncate">
            {row.usuario_nombre || row.usuario_id}
          </Text>
          <Text variant="caption" color="text-secondary" className="truncate text-[10px]">
            {row.rol || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      key: 'modulo',
      label: 'Módulo / Acción',
      minWidth: '150px',
      filterable: true,
      subFilters: [
        { key: 'modulo', label: 'Módulo' },
        { key: 'accion', label: 'Acción' },
        { key: 'entidad_tipo', label: 'Tipo Entidad' },
        { key: 'entidad_id', label: 'ID Entidad' },
      ],
      render: (row) => (
        <div className="flex flex-col min-w-0">
          <Text variant="body2" className="text-[var(--color-text-primary)] truncate">
            {humanizarModulo(row.modulo)}
          </Text>
          <Text variant="caption" color="text-secondary" className="uppercase text-[10px] tracking-wider truncate" title={humanizarAccionDetallada(row)}>
            {humanizarAccionDetallada(row)}
          </Text>
        </div>
      ),
    },
    {
      key: 'ruta',
      label: 'Ruta / HTTP',
      minWidth: '200px',
      flex: true,
      filterable: true,
      subFilters: [
        { key: 'ruta', label: 'Ruta' },
        { key: 'metodo_http', label: 'Método HTTP' },
        { key: 'codigo_respuesta', label: 'Cód. Respuesta' },
      ],
      render: (row) => (
        <div className="flex flex-col min-w-0">
          <Text variant="body2" className="truncate max-w-[200px]" title={row.ruta || 'N/A'}>
            {row.ruta || 'N/A'}
          </Text>
          <Text variant="caption" color="text-secondary" className="text-[10px]">
            {row.metodo_http || 'N/A'} • {row.codigo_respuesta || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      key: 'direccion_ip',
      label: 'IP / Dispositivo',
      minWidth: '130px',
      filterable: true,
      subFilters: [
        { key: 'direccion_ip', label: 'Dirección IP' },
      ],
      render: (row) => (
        <div className="flex flex-col min-w-0">
          <Text variant="body2" className="font-mono text-[12px]">{row.direccion_ip || 'N/A'}</Text>
          <Text variant="caption" color="text-secondary" className="truncate max-w-[150px] text-[10px]" title={row.agente_usuario || ''}>
            {parseUserAgent(row.agente_usuario)}
          </Text>
        </div>
      ),
    },
    {
      key: 'resultado',
      label: 'Resultado',
      minWidth: '100px',
      centered: true,
      filterable: true,
      subFilters: [
        { key: 'resultado', label: 'Resultado' }
      ],
      render: (row) => (
        <Badge variant={getResultColor(row.resultado) as any} size="sm">
          {humanizarResultado(row.resultado, row.codigo_respuesta).toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'severidad',
      label: 'Severidad',
      minWidth: '150px',
      filterable: false,
      render: (row) => {
        const sev = calcularSeveridad(row);
        let info = getSeveridadDetalle(sev);

        const esConsultaTercero =
          row.modulo === 'viaticos' &&
          row.metadatos?.cedula_consultada &&
          row.usuario_id &&
          !row.usuario_id.includes(row.metadatos.cedula_consultada);

        if (esConsultaTercero && sev === 'Medio') {
          info = { significado: 'Consulta a tercero', accion: 'Validar motivo' };
        }
        return (
          <div className="flex flex-col gap-1 min-w-[150px]">
            <Badge variant={getSeveridadColor(sev) as any} size="sm" className="w-fit font-bold">
              {sev.toUpperCase()}
            </Badge>
            <div className="text-[10px] leading-tight text-[var(--color-text-secondary)]">
              <Text as="span" color="inherit" className="font-semibold block">{info.significado}</Text>
              <Text as="span" color="inherit" className="block text-[var(--color-primary)] italic font-semibold mt-0.5">Acción: {info.accion}</Text>
            </div>
          </div>
        );
      }
    }
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
