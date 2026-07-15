import { useMemo } from 'react';
import { Badge, Checkbox } from '../../../../../components/atoms';
import { DataTable, type DataTableColumn } from '../../../../../components/molecules/DataTable';
import type { EmpleadoErpAlcance } from '../types';
import EmpleadoDatos from './EmpleadoDatos';

interface EmpleadosRelacionTableProps {
  items: EmpleadoErpAlcance[];
  cargando: boolean;
  columnFilters: Record<string, Set<string>>;
  columnOptions: Record<string, string[]>;
  seleccionado: (empleado: EmpleadoErpAlcance) => boolean;
  onFilterChange: (columnKey: string, filter: Set<string>) => void;
  onToggle: (empleado: EmpleadoErpAlcance) => void;
}

const EmpleadosRelacionTable = ({ items, cargando, columnFilters, columnOptions, seleccionado, onFilterChange, onToggle }: EmpleadosRelacionTableProps) => {
  const columns = useMemo<DataTableColumn<EmpleadoErpAlcance>[]>(() => [
    { key: 'sel', label: 'Sel.', minWidth: '56px', centered: true, render: (item) => <Checkbox checked={seleccionado(item)} onChange={() => onToggle(item)} aria-label={`${seleccionado(item) ? 'Quitar' : 'Relacionar'} ${item.nombre ?? item.cedula}`} /> },
    { key: 'empleado', label: 'Empleado', minWidth: '280px', flex: true, filterable: true, subFilters: [{ key: 'cargo', label: 'Cargo' }, { key: 'relacionado', label: 'Relación' }], render: (item) => <div className="py-1 text-left"><EmpleadoDatos etiqueta="Nombre" valor={item.nombre} /><EmpleadoDatos etiqueta="Cédula" valor={item.cedula} mono /><EmpleadoDatos etiqueta="Cargo" valor={item.cargo} /><EmpleadoDatos etiqueta="Relación" valor={item.relacionado ? 'Relacionado' : 'No relacionado'} /></div> },
    { key: 'operacion', label: 'Operación', minWidth: '240px', flex: true, filterable: true, subFilters: [{ key: 'area', label: 'Área' }, { key: 'ciudad', label: 'Ciudad' }, { key: 'jefe', label: 'Jefe' }], render: (item) => <div className="py-1 text-left"><EmpleadoDatos etiqueta="Área" valor={item.area} /><EmpleadoDatos etiqueta="Ciudad" valor={item.ciudadcontratacion} /><EmpleadoDatos etiqueta="Jefe" valor={item.jefe} /></div> },
    { key: 'he', label: 'HE', minWidth: '150px', centered: true, filterable: true, subFilters: [{ key: 'autoriza_he', label: 'Autoriza HE' }, { key: 'disponible_semana', label: 'Disponibilidad' }], render: (item) => <div className="flex flex-col items-center gap-1"><Badge size="xs" variant={item.autoriza_he ? 'success' : 'warning'}>{item.autoriza_he ? 'Autoriza' : 'No autoriza'}</Badge><Badge size="xs" variant={item.disponible_semana ? 'info' : 'warning'}>{item.disponible_semana ? 'Disponible' : item.motivo_no_disponible?.replaceAll('_', ' ') || 'No disponible'}</Badge></div> },
  ], [onToggle, seleccionado]);
  return <DataTable columns={columns} data={items} keyExtractor={(item) => item.cedula} columnFilters={columnFilters} columnOptions={columnOptions} onFilterChange={onFilterChange} isLoading={cargando} loadingMessage="Consultando catálogo ERP..." emptyMessage="No hay empleados para los filtros actuales." className="border-none shadow-none" />;
};

export default EmpleadosRelacionTable;
