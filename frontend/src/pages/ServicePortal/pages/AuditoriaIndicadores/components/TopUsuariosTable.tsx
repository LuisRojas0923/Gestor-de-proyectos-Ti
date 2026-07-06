import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { DataTable, DataTableColumn } from '../../../../../components/molecules/DataTable';
import { Users, Clock } from 'lucide-react';
import type { TopUsuario } from '../../../../../types/auditoria';

interface TopUsuariosTableProps {
  datos: TopUsuario[];
}

const TopUsuariosTable: React.FC<TopUsuariosTableProps> = ({ datos }) => {
  const columns: DataTableColumn<TopUsuario>[] = [
    {
      key: 'usuario',
      label: 'Usuario',
      flex: true,
      render: (user) => (
        <Text variant="body2" weight="medium">{user.usuario_nombre || user.usuario_id || 'Desconocido'}</Text>
      )
    },
    {
      key: 'eventos',
      label: 'Eventos',
      minWidth: '100px',
      render: (user) => (
        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
          {user.total.toLocaleString()}
        </div>
      )
    },
    {
      key: 'ultimo',
      label: 'Último Acceso',
      minWidth: '150px',
      render: (user) => {
        const date = user.ultimo_evento ? new Date(user.ultimo_evento) : null;
        const formattedDate = date && !isNaN(date.getTime()) 
          ? date.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : 'N/A';
        return (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <Clock className="w-3 h-3" />
            {formattedDate}
          </div>
        );
      }
    }
  ];

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-full flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-[var(--color-primary)]" />
        <div>
          <Title variant="h6">Top Usuarios</Title>
          <Text variant="caption" color="text-secondary">Usuarios con más interacciones</Text>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 border border-[var(--color-border)] rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={datos}
          keyExtractor={(row, i) => row.usuario_id || String(i)}
          emptyMessage="No hay datos para este período."
          className="h-full"
          maxHeight="100%"
        />
      </div>
    </Card>
  );
};

export default TopUsuariosTable;
