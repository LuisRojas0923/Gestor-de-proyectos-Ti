import React, { useState, useMemo } from 'react';
import { MaterialCard as Card, Title, Text, Select } from '../../../../../components/atoms';
import { DataTable, DataTableColumn } from '../../../../../components/molecules/DataTable';
import { Link2, AlertTriangle } from 'lucide-react';
import type { TopRuta } from '../../../../../types/auditoria';
import { humanizarRuta, humanizarAccion } from '../utils/humanizer';

interface TopRutasTableProps {
  datos: TopRuta[];
  onRouteClick?: (ruta: TopRuta) => void;
}

const MODULOS_DISPONIBLES = [
  { value: 'todos', label: 'Todos los módulos' },
  { value: 'auth', label: 'Autenticación' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'requisiciones', label: 'Requisiciones' },
  { value: 'sistemas', label: 'Sistemas' },
  { value: 'actividades', label: 'Actividades' },
  { value: 'impuestos', label: 'Gestión Tributaria' },
  { value: 'comisiones', label: 'Nómina: Comisiones' },
  { value: 'inventario', label: 'Inventario Anual de TI' },
];

const TopRutasTable: React.FC<TopRutasTableProps> = ({ datos, onRouteClick }) => {
  const [filtroModulo, setFiltroModulo] = useState<string>('todos');

  const datosFiltrados = useMemo(() => {
    if (!datos) return [];
    if (filtroModulo === 'todos') return datos;
    
    return datos.filter(row => {
      // Intentamos inferir el módulo basado en la ruta (ej. /api/v2/viaticos/...)
      const rutaNormalizada = (row.ruta || '').toLowerCase();
      // Casos especiales si la ruta no tiene el mismo nombre exacto que el valor del filtro
      if (filtroModulo === 'auth' && rutaNormalizada.includes('/auth/')) return true;
      if (filtroModulo === 'viaticos' && rutaNormalizada.includes('/viaticos')) return true;
      if (filtroModulo === 'requisiciones' && rutaNormalizada.includes('/requisiciones')) return true;
      if (filtroModulo === 'sistemas' && rutaNormalizada.includes('/sistemas')) return true;
      if (filtroModulo === 'actividades' && rutaNormalizada.includes('/actividades')) return true;
      if (filtroModulo === 'impuestos' && rutaNormalizada.includes('/impuestos')) return true;
      if (filtroModulo === 'comisiones' && rutaNormalizada.includes('/comisiones')) return true;
      if (filtroModulo === 'inventario' && rutaNormalizada.includes('/inventario')) return true;
      
      return rutaNormalizada.includes(filtroModulo);
    });
  }, [datos, filtroModulo]);

  const columns: DataTableColumn<TopRuta>[] = [
    {
      key: 'ruta',
      label: 'Acción / Endpoint',
      flex: true,
      render: (ruta) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Text as="span" color="inherit" className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)] border border-[var(--color-border)] tracking-wider">
              {humanizarAccion(ruta.accion)}
            </Text>
            <Text variant="body2" className="truncate font-medium text-[var(--color-text-primary)]" title={humanizarRuta(ruta.ruta)}>
              {humanizarRuta(ruta.ruta)}
            </Text>
          </div>
          <Text variant="caption" className="truncate font-mono text-[10px] text-[var(--color-text-secondary)] mt-1 block" title={ruta.ruta}>
            {ruta.ruta}
          </Text>
        </div>
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
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-full overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[var(--color-primary)]" />
            <div>
              <Title variant="h6">Top Acciones Específicas</Title>
              <Text variant="caption" color="text-secondary">Operaciones más frecuentes en el sistema</Text>
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select
              id="filtro-modulo-rutas"
              options={MODULOS_DISPONIBLES}
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              size="sm"
            />
          </div>
        </div>
        
        <div className="flex-1 min-h-0 border border-[var(--color-border)] rounded-lg overflow-hidden flex flex-col">
          <DataTable
            columns={columns}
            data={datosFiltrados}
            keyExtractor={(row, i) => row.ruta || String(i)}
            emptyMessage={filtroModulo === 'todos' ? "No hay datos para este período." : "No hay rutas para el módulo seleccionado."}
            onRowClick={onRouteClick}
            className="flex-1 min-h-0"
            maxHeight="max-h-[350px]"
          />
        </div>
      </div>
    </Card>
  );
};

export default TopRutasTable;
