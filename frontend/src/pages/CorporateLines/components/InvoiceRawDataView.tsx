import React, { useState } from 'react';
import { FileSpreadsheet, Search, Download, Filter } from 'lucide-react';
import { 
  Button, 
  Input, 
  Title,
  Text,
  Icon,
  Badge,
  Select,
} from '../../../components/atoms';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

interface DetalleRow {
  id: number;
  min: string;
  nombre: string;
  descripcion: string;
  valor: number;
  iva: number;
  ciclo: string;
  criterio: string;
}

interface Props {
  onFetchDetalle: (periodo: string) => Promise<any>;
}

const formatCurrency = (value: number) =>
  `$ ${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const criterioColor: Record<string, string> = {
  'CARGO FIJO': 'primary',
  'ESPECIALES': 'warning',
  'OTROS': 'default',
};

export const InvoiceRawDataView: React.FC<Props> = ({ onFetchDetalle }) => {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7).replace('-', ''));
  const [data, setData] = useState<DetalleRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [criterioFilter, setCriterioFilter] = useState('all');
  const { addNotification } = useNotifications();

  const loadData = async () => {
    if (!periodo) {
      addNotification('warning', 'Ingrese un periodo válido');
      return;
    }
    setIsLoading(true);
    try {
      const res = await onFetchDetalle(periodo);
      setData(res as DetalleRow[]);
      if ((res as DetalleRow[]).length === 0) {
        addNotification('info', 'No hay datos importados para este periodo.');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Error al cargar detalle');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(row => {
    const matchesSearch =
      row.min.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCriterio = criterioFilter === 'all' || row.criterio === criterioFilter;
    return matchesSearch && matchesCriterio;
  });

  const totals = filteredData.reduce(
    (acc, row) => ({
      valor: acc.valor + row.valor,
      iva: acc.iva + row.iva,
    }),
    { valor: 0, iva: 0 }
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Controles */}
      <div className="p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">Periodo (AAAAMM)</Text>
            <Input
              type="text"
              placeholder="Ej: 202604"
              value={periodo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodo(e.target.value)}
              className="!rounded-2xl"
            />
          </div>
          <Button
            variant="primary"
            onClick={loadData}
            disabled={isLoading}
            loading={isLoading}
            icon={FileSpreadsheet}
            className="rounded-2xl h-12 px-6"
          >
            Consultar Detalle
          </Button>
        </div>
      </div>

      {/* Tabla de datos */}
      {data.length > 0 && (
        <div className="overflow-hidden rounded-3xl">
          {/* Header con filtros */}
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <Title variant="h4">Detalle de Factura Importada</Title>
                <Text variant="caption" className="opacity-60">
                  {filteredData.length} registros · Periodo {periodo}
                </Text>
              </div>
              <Button variant="outline" size="sm" icon={Download} className="rounded-xl">
                Exportar
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Buscar por MIN, nombre o descripción..."
                icon={Search}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="!rounded-xl border-none bg-neutral-100 dark:bg-neutral-700"
              />
              <Select
                value={criterioFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCriterioFilter(e.target.value)}
                options={[
                  { label: 'Todos los Criterios', value: 'all' },
                  { label: 'CARGO FIJO', value: 'CARGO FIJO' },
                  { label: 'ESPECIALES', value: 'ESPECIALES' },
                  { label: 'OTROS', value: 'OTROS' },
                ]}
                className="!rounded-xl"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                <Icon name={Filter} size="xs" className="opacity-40" />
                <Text variant="caption" className="opacity-60">
                  Valor total: <Text as="span" weight="bold" className="text-primary">{formatCurrency(totals.valor)}</Text>
                  {' · '}
                  IVA total: <Text as="span" weight="bold">{formatCurrency(totals.iva)}</Text>
                </Text>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">MIN</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">IVA</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-center">Ciclo</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-center">Criterios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-colors text-sm">
                    <td className="px-4 py-3 font-mono font-medium text-primary whitespace-nowrap">
                      {row.min}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={row.nombre}>
                      {row.nombre}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate opacity-80" title={row.descripcion}>
                      {row.descripcion}
                    </td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                      {formatCurrency(row.valor)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap text-neutral-500">
                      {formatCurrency(row.iva)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="default" className="text-[10px] px-2 py-0.5 rounded-lg">
                        {row.ciclo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={criterioColor[row.criterio] as any || 'default'}
                        className="text-[10px] px-2 py-0.5 rounded-lg"
                      >
                        {row.criterio}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {data.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <Icon name={FileSpreadsheet} className="w-16 h-16 mb-4" />
          <Text>Seleccione un periodo y consulte los datos importados.</Text>
        </div>
      )}
    </div>
  );
};
