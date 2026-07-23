import React, { useMemo } from 'react';
import { DataTable } from '../../../../../components/molecules/DataTable';
import type { DataTableColumn } from '../../../../../components/molecules/DataTable';
import { Badge, MaterialCard as Card, Text, Title } from '../../../../../components/atoms';
import type { AuditoriaEventoResumen, StatsPorModulo } from '../../../../../types/auditoria';
import {
  etiquetaResultado,
  formatearFechaAuditoria,
  humanizarAccion,
  humanizarModulo,
  varianteResultado,
} from '../utils/formatters';

interface UltimosEventosTableProps {
  datos: StatsPorModulo[];
}

const columnas: DataTableColumn<AuditoriaEventoResumen>[] = [
  {
    key: 'timestamp',
    label: 'Fecha',
    minWidth: '8.5rem',
    render: (fila) => <Text as="span" variant="caption">{formatearFechaAuditoria(fila.timestamp)}</Text>,
  },
  {
    key: 'usuario',
    label: 'Usuario',
    minWidth: '10rem',
    flex: true,
    render: (fila) => <Text as="span" variant="body2" className="block truncate">{fila.usuario_nombre || fila.usuario_id}</Text>,
  },
  {
    key: 'modulo',
    label: 'Módulo',
    minWidth: '10rem',
    render: (fila) => <Text as="span" variant="caption">{humanizarModulo(fila.modulo)}</Text>,
  },
  {
    key: 'accion',
    label: 'Acción',
    minWidth: '8rem',
    render: (fila) => <Text as="span" variant="caption">{humanizarAccion(fila.accion)}</Text>,
  },
  {
    key: 'resultado',
    label: 'Resultado',
    minWidth: '6.5rem',
    render: (fila) => <Badge variant={varianteResultado(fila.resultado)} size="sm">{etiquetaResultado(fila.resultado)}</Badge>,
  },
];

const ordenarEventos = (datos: StatsPorModulo[]): AuditoriaEventoResumen[] => datos
  .flatMap((modulo) => modulo.ultimos_eventos ?? [])
  .sort((a, b) => {
    const fechaA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const fechaB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return fechaB - fechaA;
  })
  .slice(0, 20);

const UltimosEventosTable: React.FC<UltimosEventosTableProps> = ({ datos }) => {
  const eventos = useMemo(() => ordenarEventos(datos), [datos]);

  return (
    <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="mb-4">
        <Title variant="h6">Últimos eventos</Title>
        <Text variant="caption" color="text-secondary">Resumen reciente sin exponer evidencia cruda</Text>
      </div>
      <DataTable
        columns={columnas}
        data={eventos}
        keyExtractor={(fila) => String(fila.id)}
        ariaLabel="Últimos eventos de auditoría"
        emptyMessage="No hay eventos recientes para este período"
        maxHeight="max-h-80"
        minHeight="min-h-[10rem]"
        className="rounded-xl"
      />
    </Card>
  );
};

export default UltimosEventosTable;
