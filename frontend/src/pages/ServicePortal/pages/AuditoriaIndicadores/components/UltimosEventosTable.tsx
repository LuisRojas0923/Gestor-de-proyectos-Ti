import React, { useState, useMemo } from 'react';
import { MaterialCard as Card, Title, Text, Badge, Button, Select, Input } from '../../../../../components/atoms';
import { DataTable, Modal } from '../../../../../components/molecules';
import { ChevronDown, ChevronRight, Users, Search } from 'lucide-react';
import type { AuditoriaEvento, ResultadoAuditoria } from '../../../../../types/auditoria';
import { humanizarModulo, humanizarAccionDetallada, humanizarResultado } from '../utils/humanizer';

interface UltimosEventosTableProps {
  datos: AuditoriaEvento[];
  isLoading?: boolean;
  hideSearch?: boolean;
  hideModuleFilter?: boolean;
  hideGroupButton?: boolean;
}

const getResultColor = (resultado: ResultadoAuditoria) => {
  switch (resultado) {
    case 'exito':
      return 'success';
    case 'fallo':
      return 'warning';
    case 'denegado':
      return 'error';
    default:
      return 'default';
  }
};

type Severidad = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

const calcularSeveridad = (row: AuditoriaEvento): Severidad => {
  const acc = (row.accion || '').toLowerCase();
  const code = row.codigo_respuesta || 200;
  
  // Detectar consulta de información de viáticos de un tercero
  const esConsultaTercero = 
    row.modulo === 'viaticos' && 
    row.metadatos?.cedula_consultada && 
    row.usuario_id && 
    !row.usuario_id.includes(row.metadatos.cedula_consultada);
    
  if (esConsultaTercero) {
    return 'Medio';
  }
  
  // 1. Si el resultado es exitoso (200-299)
  if (row.resultado === 'exito' || (code >= 200 && code < 300)) {
    // Acciones sensibles exitosas como eliminación o alteración de roles se consideran de severidad Media
    if (acc.includes('eliminar') || acc.includes('delete') || row.metodo_http === 'DELETE' || acc.includes('permisos') || acc.includes('rol')) {
      return 'Medio';
    }
    return 'Bajo';
  }
  
  // 2. Si el resultado es fallido o denegado
  // Caídas críticas del servidor (500)
  if (code >= 500) {
    return 'Crítico';
  }
  
  // Bloqueos de seguridad (401/403)
  if (row.resultado === 'denegado' || code === 403 || code === 401) {
    return 'Alto';
  }
  
  // Formularios inválidos o errores de reglas de negocio (400, 422, 409)
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
    case 'Crítico':
      return { significado: 'Posible incidente', accion: 'Escalar' };
    case 'Alto':
      return { significado: 'Riesgo operativo o seguridad', accion: 'Revisar inmediatamente' };
    case 'Medio':
      return { significado: 'Requiere revisión', accion: 'Validar causa' };
    case 'Bajo':
    default:
      return { significado: 'Comportamiento normal', accion: 'Sin acción' };
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
  
  // Fallback si no reconoce nada, devuelve la primera palabra (ej. "Mozilla/5.0")
  return ua.split(' ')[0] || 'Desconocido';
};

const MODULOS_DISPONIBLES = [
  { value: 'todos', label: 'Todos los módulos' },
  { value: 'auth', label: 'Autenticación' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'requisiciones', label: 'Requisiciones' },
  { value: 'sistemas', label: 'Sistemas' },
  { value: 'actividades', label: 'Actividades' },
  { value: 'impuestos', label: 'Gestión Tributaria' },
  { value: 'comisiones', label: 'Nómina: Comisiones' },
];

const UltimosEventosTable: React.FC<UltimosEventosTableProps> = ({ 
  datos, 
  isLoading, 
  hideSearch = false,
  hideModuleFilter = false,
  hideGroupButton = false
}) => {
  const [agrupado, setAgrupado] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [filtroModulo, setFiltroModulo] = useState<string>('todos');
  const [busquedaUsuario, setBusquedaUsuario] = useState<string>('');
  const [eventoSeleccionado, setEventoSeleccionado] = useState<AuditoriaEvento | null>(null);

  const datosFiltrados = useMemo(() => {
    if (!datos) return [];
    let filtrados = datos;
    
    if (filtroModulo !== 'todos') {
      filtrados = filtrados.filter(row => row.modulo === filtroModulo);
    }
    
    if (busquedaUsuario.trim() !== '') {
      const query = busquedaUsuario.toLowerCase().trim();
      filtrados = filtrados.filter(row => {
        const nombre = (row.usuario_nombre || '').toLowerCase();
        const id = (row.usuario_id || '').toLowerCase();
        return nombre.includes(query) || id.includes(query);
      });
    }
    
    return filtrados;
  }, [datos, filtroModulo, busquedaUsuario]);

  const groupedData = useMemo(() => {
    if (!agrupado || !datosFiltrados) return [];
    const groups = new Map<string, AuditoriaEvento[]>();
    (datosFiltrados || []).forEach(row => {
      const key = row.usuario_id || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });
    return Array.from(groups.entries()).map(([id, events]) => ({
      usuario_id: id,
      usuario_nombre: events[0]?.usuario_nombre || id,
      rol: events[0]?.rol,
      eventos: events
    })).sort((a, b) => b.eventos.length - a.eventos.length);
  }, [datosFiltrados, agrupado]);

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const columns = [
    {
      key: 'timestamp',
      label: 'Fecha y Hora',
      render: (row: AuditoriaEvento) => row.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A'
    },
    {
      key: 'usuario',
      label: 'Usuario',
      render: (row: AuditoriaEvento) => (
        <div className="flex flex-col">
          <Text variant="body2" className="font-medium text-[var(--color-text-primary)]">
            {row.usuario_nombre || row.usuario_id}
          </Text>
          <Text variant="caption" color="text-secondary">
            {row.rol || 'N/A'}
          </Text>
        </div>
      )
    },
    {
      key: 'modulo',
      label: 'Módulo / Acción',
      render: (row: AuditoriaEvento) => (
        <div className="flex flex-col">
          <Text variant="body2" className="text-[var(--color-text-primary)]">{humanizarModulo(row.modulo)}</Text>
          <Text variant="caption" color="text-secondary" className="uppercase text-[10px] tracking-wider">{humanizarAccionDetallada(row)}</Text>
        </div>
      )
    },
    {
      key: 'ruta',
      label: 'Ruta / HTTP',
      render: (row: AuditoriaEvento) => (
        <div className="flex flex-col">
          <Text variant="body2" className="truncate max-w-[200px]" title={row.ruta || 'N/A'}>
            {row.ruta || 'N/A'}
          </Text>
          <Text variant="caption" color="text-secondary">
            {row.metodo_http || 'N/A'} • {row.codigo_respuesta || 'N/A'}
          </Text>
        </div>
      )
    },
    {
      key: 'ip',
      label: 'IP / Dispositivo',
      render: (row: AuditoriaEvento) => (
        <div className="flex flex-col">
          <Text variant="body2">{row.direccion_ip || 'N/A'}</Text>
          <Text variant="caption" color="text-secondary" className="truncate max-w-[150px]" title={row.agente_usuario || ''}>
            {parseUserAgent(row.agente_usuario)}
          </Text>
        </div>
      )
    },
    {
      key: 'resultado',
      label: 'Resultado',
      render: (row: AuditoriaEvento) => (
        <Badge variant={getResultColor(row.resultado) as any} size="sm">
          {humanizarResultado(row.resultado, row.codigo_respuesta).toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'severidad',
      label: 'Severidad',
      render: (row: AuditoriaEvento) => {
        const sev = calcularSeveridad(row);
        let info = getSeveridadDetalle(sev);
        
        // Sobreescribir detalle si es consulta de terceros
        const esConsultaTercero = 
          row.modulo === 'viaticos' && 
          row.metadatos?.cedula_consultada && 
          row.usuario_id && 
          !row.usuario_id.includes(row.metadatos.cedula_consultada);
          
        if (esConsultaTercero && sev === 'Medio') {
          info = { significado: 'Consulta de información de tercero', accion: 'Validar motivo de consulta' };
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

  const columnsWithoutUser = columns.filter(c => c.key !== 'usuario');

  return (
    <Card className={`p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm ${hideSearch && hideModuleFilter && hideGroupButton ? 'border-none shadow-none' : ''}`}>
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {!(hideSearch && hideModuleFilter && hideGroupButton) ? (
            <div>
              <Title variant="h6">Últimos Eventos Relevantes</Title>
              <Text variant="caption" color="text-secondary">Log detallado de las transacciones más recientes</Text>
            </div>
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-3">
            {!hideSearch && (
              <div className="w-56">
                <Input
                  id="buscar-usuario"
                  placeholder="Buscar usuario o cédula..."
                  value={busquedaUsuario}
                  onChange={(e) => setBusquedaUsuario(e.target.value)}
                  icon={Search}
                  size="sm"
                />
              </div>
            )}
            {!hideModuleFilter && (
              <div className="w-48">
                <Select
                  id="filtro-modulo"
                  options={MODULOS_DISPONIBLES}
                  value={filtroModulo}
                  onChange={(e) => setFiltroModulo(e.target.value)}
                  size="sm"
                />
              </div>
            )}
            {!hideGroupButton && (
              <Button 
                variant={agrupado ? 'primary' : 'outline'} 
                size="sm" 
                onClick={() => setAgrupado(!agrupado)}
                icon={Users}
              >
                {agrupado ? 'Desagrupar' : 'Agrupar por Persona'}
              </Button>
            )}
          </div>
        </div>

      {!agrupado ? (
        <DataTable 
          columns={columns} 
          data={datosFiltrados} 
          keyExtractor={(row) => row.id.toString()}
          emptyMessage="No se encontraron eventos en este período."
          onRowClick={(row) => setEventoSeleccionado(row)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groupedData.length === 0 ? (
            <div className="text-center p-4 text-[var(--color-text-secondary)] text-sm">
              No se encontraron eventos en este período.
            </div>
          ) : (
            groupedData.map(group => {
              const isExpanded = expandedUsers.has(group.usuario_id);
              return (
                <div key={group.usuario_id || Math.random().toString()} className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
                  <div 
                    className="p-3 bg-[var(--color-surface-variant)] flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleUser(group.usuario_id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" /> : <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />}
                      <div className="flex flex-col">
                        <Text variant="body2" weight="bold">{group.usuario_nombre}</Text>
                        <Text variant="caption" color="text-secondary">{group.usuario_id} • {group.rol || 'Sin Rol'}</Text>
                      </div>
                    </div>
                    <Badge variant="default" size="sm">{group.eventos.length} eventos</Badge>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)]">
                      <DataTable 
                        columns={columnsWithoutUser} 
                        data={group.eventos} 
                        keyExtractor={(row) => row.id.toString()}
                        onRowClick={(row) => setEventoSeleccionado(row)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Detalles del Evento */}
      <Modal
        isOpen={!!eventoSeleccionado}
        onClose={() => setEventoSeleccionado(null)}
        title="Radiografía del Evento"
        size="lg"
      >
        {eventoSeleccionado && (
          <div className="space-y-6">
            {/* Cabecera / Info Principal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider block mb-1">Usuario</Text>
                <Text variant="body2" weight="medium" className="text-[var(--color-text-primary)]">{eventoSeleccionado.usuario_nombre || eventoSeleccionado.usuario_id}</Text>
                <Text variant="caption" color="text-secondary">{eventoSeleccionado.rol || 'Sin rol'}</Text>
              </div>
              <div>
                <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider block mb-1">Fecha y Hora</Text>
                <Text variant="body2" weight="medium" className="text-[var(--color-text-primary)]">
                  {eventoSeleccionado.timestamp ? new Date(eventoSeleccionado.timestamp).toLocaleString() : 'N/A'}
                </Text>
              </div>
            </div>

            {/* Módulo y Acción */}
            <div className="bg-[var(--color-surface-variant)] p-4 rounded-xl border border-[var(--color-border)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider block mb-1">Módulo</Text>
                  <Text variant="body2" weight="medium" className="text-[var(--color-text-primary)]">{humanizarModulo(eventoSeleccionado.modulo)}</Text>
                </div>
                <div>
                  <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider block mb-1">Acción Específica</Text>
                  <Text variant="body2" weight="medium" className="text-[var(--color-text-primary)]">{humanizarAccionDetallada(eventoSeleccionado)}</Text>
                </div>
              </div>
            </div>

            {/* Detalles Técnicos */}
            <div>
              <Text variant="subtitle2" weight="bold" color="text-primary" className="mb-3 border-b border-[var(--color-border)] pb-2">Detalles Técnicos</Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <Text variant="caption" color="text-secondary" className="block mb-1">Ruta (Endpoint)</Text>
                  <Text variant="body2" className="font-mono text-[11px] break-all bg-[var(--color-surface-variant)] px-2 py-1 rounded text-[var(--color-text-primary)] inline-block">{eventoSeleccionado.ruta || 'N/A'}</Text>
                </div>
                <div>
                  <Text variant="caption" color="text-secondary" className="block mb-1">Método / Código HTTP</Text>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm" className="font-mono">{eventoSeleccionado.metodo_http || 'N/A'}</Badge>
                    <Badge variant={eventoSeleccionado.codigo_respuesta && eventoSeleccionado.codigo_respuesta >= 400 ? 'error' : 'success'} size="sm" className="font-mono">{eventoSeleccionado.codigo_respuesta || 'N/A'}</Badge>
                  </div>
                </div>
                <div>
                  <Text variant="caption" color="text-secondary" className="block mb-1">Dirección IP</Text>
                  <Text variant="body2" className="font-mono text-[12px] text-[var(--color-text-primary)]">{eventoSeleccionado.direccion_ip || 'N/A'}</Text>
                </div>
                <div>
                  <Text variant="caption" color="text-secondary" className="block mb-1">Agente de Usuario</Text>
                  <Text variant="body2" className="text-[11px] text-[var(--color-text-secondary)] leading-snug">
                    {eventoSeleccionado.agente_usuario || 'N/A'}
                  </Text>
                </div>
              </div>
            </div>

            {/* Metadatos / Payload */}
            {eventoSeleccionado.metadatos && Object.keys(eventoSeleccionado.metadatos).length > 0 && (
              <div>
                <Text variant="subtitle2" weight="bold" color="text-primary" className="mb-3 border-b border-[var(--color-border)] pb-2">Metadatos / Payload del Evento</Text>
                <div className="bg-[#1e1e1e] dark:bg-[#0a0a0a] rounded-xl p-4 overflow-x-auto shadow-inner border border-gray-800">
                  <pre className="text-[#d4d4d4] text-[12px] font-mono whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(eventoSeleccionado.metadatos, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default UltimosEventosTable;
