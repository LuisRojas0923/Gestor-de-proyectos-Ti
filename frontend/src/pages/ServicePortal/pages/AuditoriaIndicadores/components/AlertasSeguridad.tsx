import React, { useMemo } from 'react';
import { MaterialCard as Card, Title, Text, Badge } from '../../../../../components/atoms';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { AuditoriaEvento } from '../../../../../types/auditoria';

interface AlertasSeguridadProps {
  datos: AuditoriaEvento[];
}

export const AlertasSeguridad: React.FC<AlertasSeguridadProps> = ({ datos }) => {
  const alertas = useMemo(() => {
    const list: { id: string; tipo: 'error' | 'warning' | 'info'; mensaje: string }[] = [];
    if (!datos || datos.length === 0) return list;

    // 1. Detectar accesos denegados recurrentes por IP
    const fallosPorIp: Record<string, number> = {};
    datos.forEach(row => {
      if ((row.resultado === 'denegado' || row.codigo_respuesta === 403 || row.codigo_respuesta === 401) && row.direccion_ip) {
        fallosPorIp[row.direccion_ip] = (fallosPorIp[row.direccion_ip] || 0) + 1;
      }
    });
    Object.entries(fallosPorIp).forEach(([ip, total]) => {
      if (total >= 3) {
        list.push({
          id: `ip-${ip}`,
          tipo: 'error',
          mensaje: `IP ${ip} registra ${total} accesos bloqueados en la última hora. Posible intento de intrusión.`
        });
      }
    });

    // 2. Detectar acciones críticas (Eliminación de datos o alteración de permisos)
    datos.forEach(row => {
      const acc = (row.accion || '').toLowerCase();
      if (acc.includes('eliminar') || acc.includes('delete') || row.metodo_http === 'DELETE') {
        list.push({
          id: `critica-${row.id}`,
          tipo: 'warning',
          mensaje: `El usuario ${row.usuario_nombre || row.usuario_id} ejecutó una eliminación sensible en el módulo ${row.modulo}.`
        });
      }
      if (acc.includes('permisos') || acc.includes('rol')) {
        list.push({
          id: `permiso-${row.id}`,
          tipo: 'warning',
          mensaje: `El usuario ${row.usuario_nombre || row.usuario_id} modificó privilegios/permisos.`
        });
      }
    });

    return list.slice(0, 3); // Top 3 alertas
  }, [datos]);

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Title variant="h6" className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[var(--color-primary)]" />
              Alertas de Seguridad
            </Title>
            <Text variant="caption" color="text-secondary">Patrones sospechosos detectados en tiempo real</Text>
          </div>
          <Badge variant={alertas.length > 0 ? 'error' : 'success'} size="sm">
            {alertas.length > 0 ? `${alertas.length} ALERTAS` : 'SISTEMA SEGURO'}
          </Badge>
        </div>

        <div className="space-y-3 mt-2 flex-grow">
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="w-10 h-10 text-green-500 mb-2" />
              <Text variant="body2" color="text-secondary" weight="medium">
                Sin alertas activas. El comportamiento de los usuarios es normal.
              </Text>
            </div>
          ) : (
            alertas.map(alerta => (
              <div
                key={alerta.id}
                className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                  alerta.tipo === 'error'
                    ? 'bg-red-50/20 border-red-500/20 text-red-500'
                    : 'bg-yellow-50/20 border-yellow-500/20 text-yellow-500'
                }`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <Text variant="body2" color="inherit" className="font-medium">
                  {alerta.mensaje}
                </Text>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
