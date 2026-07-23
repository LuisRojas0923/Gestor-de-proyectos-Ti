import React from 'react';
import { DataTable } from '../../../../../components/molecules/DataTable';
import type { DataTableColumn } from '../../../../../components/molecules/DataTable';
import { MaterialCard as Card, Text, Title } from '../../../../../components/atoms';
import type { TopUsuario } from '../../../../../types/auditoria';
import { formatearFechaAuditoria } from '../utils/formatters';

interface TopUsuariosTableProps {
  datos: TopUsuario[];
}

const columnas: DataTableColumn<TopUsuario>[] = [
  {
    key: 'usuario',
    label: 'Usuario',
    minWidth: '12rem',
    flex: true,
    render: (fila) => (
      <div className="min-w-0">
        <Text as="span" variant="body2" weight="semibold" className="block truncate">
          {fila.usuario_nombre || 'Usuario sin nombre'}
        </Text>
        <Text as="span" variant="caption" color="text-secondary" className="block truncate">
          {fila.usuario_id}
        </Text>
      </div>
    ),
  },
  {
    key: 'total',
    label: 'Eventos',
    minWidth: '5.5rem',
    centered: true,
    render: (fila) => <Text as="span" weight="bold">{fila.total.toLocaleString()}</Text>,
  },
  {
    key: 'ultimo_evento',
    label: 'Último evento',
    minWidth: '8.5rem',
    render: (fila) => <Text as="span" variant="caption">{formatearFechaAuditoria(fila.ultimo_evento)}</Text>,
  },
];

const TopUsuariosTable: React.FC<TopUsuariosTableProps> = ({ datos }) => (
  <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
    <div className="mb-4">
      <Title variant="h6">Usuarios con más actividad</Title>
      <Text variant="caption" color="text-secondary">Principales actores del período seleccionado</Text>
    </div>
    <DataTable
      columns={columnas}
      data={datos}
      keyExtractor={(fila) => fila.usuario_id}
      ariaLabel="Usuarios con más actividad"
      emptyMessage="No hay usuarios para este período"
      maxHeight="max-h-72"
      minHeight="min-h-[10rem]"
      className="rounded-xl"
    />
  </Card>
);

export default TopUsuariosTable;
