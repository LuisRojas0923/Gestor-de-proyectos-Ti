import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { DataTable, DataTableColumn } from '../../../../../components/molecules/DataTable';
import { Link2, AlertTriangle } from 'lucide-react';
import type { TopRuta } from '../../../../../types/auditoria';

interface TopRutasTableProps {
  datos: TopRuta[];
}

const TopRutasTable: React.FC<TopRutasTableProps> = ({ datos }) => {
  const columns: DataTableColumn<TopRuta>[] = [
    {
      key: 'ruta',
      label: 'Ruta / Endpoint',
      flex: true,
      render: (ruta) => (
        <Text variant="body2" className="truncate font-mono text-[11px]" title={ruta.ruta}>
          {ruta.ruta}
        </Text>
      )
    },
    {
      key: 'peticiones',
      label: 'Peticiones',
      minWidth: '100px',
      centered: true,
      render: (ruta) => (
        <Text variant="body2" weight="medium">{ruta.total.toLocaleString()}</Text>
      )
    },
    {
      key: 'fallos',
      label: 'Fallos',
      minWidth: '100px',
      centered: true,
      render: (ruta) => (
        <Text variant="body2">{ruta.fallos.toLocaleString()}</Text>
      )
    },
    {
      key: 'tasa_fallo',
      label: '% Fallo',
      minWidth: '100px',
      centered: true,
      render: (ruta) => {
        const tasaFallos = ruta.total > 0 ? (ruta.fallos / ruta.total) * 100 : 0;
        const esAlerta = tasaFallos > 10;
        return (
          <div className={`inline-flex items-center justify-center gap-1 text-xs font-bold ${esAlerta ? 'text-red-500' : 'text-[var(--color-text-secondary)]'}`}>
            {esAlerta && <AlertTriangle className="w-3 h-3" />}
            {tasaFallos.toFixed(1)}%
          </div>
        );
      }
    }
  ];

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-full flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-[var(--color-primary)]" />
        <div>
          <Title variant="h6">Top Rutas</Title>
          <Text variant="caption" color="text-secondary">Endpoints más utilizados y sus fallos</Text>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 border border-[var(--color-border)] rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={datos}
          keyExtractor={(row, i) => row.ruta || String(i)}
          emptyMessage="No hay datos para este período."
          className="h-full"
          maxHeight="100%"
        />
      </div>
    </Card>
  );
};

export default TopRutasTable;
