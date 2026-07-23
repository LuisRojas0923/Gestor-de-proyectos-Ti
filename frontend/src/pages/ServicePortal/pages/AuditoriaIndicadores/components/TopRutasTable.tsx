import React from 'react';
import { DataTable } from '../../../../../components/molecules/DataTable';
import type { DataTableColumn } from '../../../../../components/molecules/DataTable';
import { Badge, MaterialCard as Card, Text, Title } from '../../../../../components/atoms';
import type { TopRuta } from '../../../../../types/auditoria';
import { humanizarAccion } from '../utils/formatters';

interface TopRutasTableProps {
  datos: TopRuta[];
}

const columnas: DataTableColumn<TopRuta>[] = [
  {
    key: 'ruta',
    label: 'Ruta',
    minWidth: '15rem',
    flex: true,
    render: (fila) => <Text as="span" variant="caption" className="block break-all font-mono">{fila.ruta}</Text>,
  },
  {
    key: 'accion',
    label: 'Acción',
    minWidth: '7rem',
    render: (fila) => <Text as="span" variant="caption">{humanizarAccion(fila.accion)}</Text>,
  },
  {
    key: 'total',
    label: 'Total',
    minWidth: '4.5rem',
    centered: true,
    render: (fila) => <Text as="span" weight="bold">{fila.total.toLocaleString()}</Text>,
  },
  {
    key: 'fallos',
    label: 'Fallos',
    minWidth: '5rem',
    centered: true,
    render: (fila) => <Badge variant={fila.fallos > 0 ? 'warning' : 'success'} size="sm">{fila.fallos}</Badge>,
  },
];

const TopRutasTable: React.FC<TopRutasTableProps> = ({ datos }) => (
  <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
    <div className="mb-4">
      <Title variant="h6">Rutas más utilizadas</Title>
      <Text variant="caption" color="text-secondary">Volumen y fallos por operación</Text>
    </div>
    <DataTable
      columns={columnas}
      data={datos}
      keyExtractor={(fila) => `${fila.ruta}:${fila.accion}`}
      ariaLabel="Rutas más utilizadas"
      emptyMessage="No hay rutas para este período"
      maxHeight="max-h-72"
      minHeight="min-h-[10rem]"
      className="rounded-xl"
    />
  </Card>
);

export default TopRutasTable;
