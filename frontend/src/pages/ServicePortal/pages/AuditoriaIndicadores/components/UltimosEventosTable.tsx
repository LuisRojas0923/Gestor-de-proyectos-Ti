import React, { useState, useMemo } from 'react';
import { MaterialCard as Card, Title, Text, Badge, Button } from '../../../../../components/atoms';
import { DataTable } from '../../../../../components/molecules';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import type { AuditoriaEvento, ResultadoAuditoria } from '../../../../../types/auditoria';

interface UltimosEventosTableProps {
  datos: AuditoriaEvento[];
  isLoading?: boolean;
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

type Severidad = 'Baja' | 'Media' | 'Alta' | 'Crítica';

const calcularSeveridad = (row: AuditoriaEvento): Severidad => {
  const acc = (row.accion || '').toLowerCase();
  
  if (row.codigo_respuesta === 500 || acc.includes('eliminar') || acc.includes('delete') || row.metodo_http === 'DELETE') {
    return 'Crítica';
  }
  if (row.resultado === 'denegado' || row.codigo_respuesta === 403 || row.codigo_respuesta === 401 || acc.includes('permisos') || acc.includes('rol')) {
    return 'Alta';
  }
  if (row.resultado === 'fallo' || acc.includes('editar') || acc.includes('actualizar') || row.metodo_http === 'PUT' || row.metodo_http === 'PATCH' || row.metodo_http === 'POST') {
    return 'Media';
  }
  return 'Baja';
};

const getSeveridadColor = (sev: Severidad) => {
  switch (sev) {
    case 'Crítica': return 'error';
    case 'Alta': return 'warning';
    case 'Media': return 'info';
    case 'Baja': return 'default';
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

const UltimosEventosTable: React.FC<UltimosEventosTableProps> = ({ datos, isLoading }) => {
  const [agrupado, setAgrupado] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const groupedData = useMemo(() => {
    if (!agrupado || !datos) return [];
    const groups = new Map<string, AuditoriaEvento[]>();
    (datos || []).forEach(row => {
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
  }, [datos, agrupado]);

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
          <Text variant="body2" className="capitalize text-[var(--color-text-primary)]">{row.modulo}</Text>
          <Text variant="caption" color="text-secondary" className="uppercase text-[10px] tracking-wider">{row.accion}</Text>
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
        <Badge variant={getResultColor(row.resultado) as any} size="sm">{(row.resultado || 'N/A').toUpperCase()}</Badge>
      )
    },
    {
      key: 'severidad',
      label: 'Severidad',
      render: (row: AuditoriaEvento) => {
        const sev = calcularSeveridad(row);
        return (
          <Badge variant={getSeveridadColor(sev) as any} size="sm">{sev.toUpperCase()}</Badge>
        );
      }
    }
  ];

  const columnsWithoutUser = columns.filter(c => c.key !== 'usuario');

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Title variant="h6">Últimos Eventos Relevantes</Title>
          <Text variant="caption" color="text-secondary">Log detallado de las transacciones más recientes</Text>
        </div>
        <Button 
          variant={agrupado ? 'primary' : 'outline'} 
          size="sm" 
          onClick={() => setAgrupado(!agrupado)}
          icon={Users}
        >
          {agrupado ? 'Desagrupar' : 'Agrupar por Persona'}
        </Button>
      </div>

      {!agrupado ? (
        <DataTable 
          columns={columns} 
          data={datos} 
          keyExtractor={(row) => row.id.toString()}
          emptyMessage="No se encontraron eventos en este período."
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
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
};

export default UltimosEventosTable;
