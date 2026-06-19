import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Select, Text, Title } from '../../../../components/atoms';
import { DataTable, type DataTableColumn } from '../../../../components/molecules/DataTable';
import { buscarEmpleadosERP } from '../../../../services/horasExtrasService';
import type { EmpleadoERPRead } from '../../../../types/horasExtras';

const LIMITE_PAGINA = 100;
const MAX_PAGINAS = 20;
const FILTRO_AUTORIZA_OPTIONS = [
  { value: 'si', label: 'Autorizado HE: SI' },
  { value: 'todos', label: 'Autorizado HE: Todos' },
  { value: 'no', label: 'Autorizado HE: NO' },
];

const deduplicarEmpleados = (empleados: EmpleadoERPRead[]): EmpleadoERPRead[] => {
  const porCedula = new Map<string, EmpleadoERPRead>();
  empleados.forEach((empleado) => {
    const cedula = empleado.cedula.trim();
    if (!porCedula.has(cedula)) porCedula.set(cedula, { ...empleado, cedula });
  });
  return Array.from(porCedula.values());
};

const empleadoValorColumna = (empleado: EmpleadoERPRead, key: string): string => {
  if (key === 'autoriza_he') {
    if (empleado.autoriza_he === true) return 'SI';
    if (empleado.autoriza_he === false) return 'NO';
    return 'Sin dato';
  }
  if (key === 'estado_he') return empleado.autoriza_he === true ? 'Disponible' : 'No disponible para HE';
  if (key === 'nombre_cargo') return `${empleado.nombre ?? '(sin nombre)'} / ${empleado.cargo ?? 'Sin cargo'}`;
  const valor = empleado[key as keyof EmpleadoERPRead];
  return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
};

const COLUMNAS_FILTRABLES = ['cedula', 'nombre_cargo', 'area', 'ciudadcontratacion', 'quien_reporta', 'autoriza_he', 'estado_he'];

const EmpleadosActivosView: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';

  const [empleados, setEmpleados] = useState<EmpleadoERPRead[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAutoriza, setFiltroAutoriza] = useState('si');
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [sortState, setSortState] = useState<{ key: string; dir: 'asc' | 'desc' | null } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargarEmpleados = async () => {
      setCargando(true);
      setError(null);
      try {
        const acumulado: EmpleadoERPRead[] = [];
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;
        let pagina = 0;

        while (offset < total && pagina < MAX_PAGINAS) {
          const respuesta = await buscarEmpleadosERP(undefined, LIMITE_PAGINA, offset, token, true);
          acumulado.push(...respuesta.items);
          total = respuesta.total;
          offset += respuesta.limit;
          pagina += 1;
          if (respuesta.items.length === 0) break;
        }

        if (!cancelado) setEmpleados(deduplicarEmpleados(acumulado));
      } catch (e: unknown) {
        if (!cancelado) {
          setEmpleados([]);
          setError(e instanceof Error ? e.message : 'Error al consultar empleados activos');
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarEmpleados();
    return () => {
      cancelado = true;
    };
  }, [token]);

  const empleadosBaseFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((empleado) => {
      if (filtroAutoriza === 'si' && empleado.autoriza_he !== true) return false;
      if (filtroAutoriza === 'no' && empleado.autoriza_he !== false) return false;
      if (!q) return true;
      return [empleado.cedula, empleado.nombre, empleado.cargo, empleado.area, empleado.ciudadcontratacion, empleado.quien_reporta]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(q));
    });
  }, [empleados, busqueda, filtroAutoriza]);

  const columnOptions = useMemo(() => {
    return COLUMNAS_FILTRABLES.reduce<Record<string, string[]>>((acc, key) => {
      acc[key] = Array.from(new Set(empleadosBaseFiltrados.map((empleado) => empleadoValorColumna(empleado, key))))
        .sort((a, b) => a.localeCompare(b, 'es'));
      return acc;
    }, {});
  }, [empleadosBaseFiltrados]);

  const empleadosFiltrados = useMemo(() => {
    const filtrados = empleadosBaseFiltrados.filter((empleado) => {
      return Object.entries(columnFilters).every(([key, filtro]) => {
        if (!filtro || filtro.size === 0) return true;
        return filtro.has(empleadoValorColumna(empleado, key));
      });
    });

    if (!sortState?.dir) return filtrados;
    return [...filtrados].sort((a, b) => {
      const aValue = empleadoValorColumna(a, sortState.key);
      const bValue = empleadoValorColumna(b, sortState.key);
      const result = aValue.localeCompare(bValue, 'es', { numeric: true, sensitivity: 'base' });
      return sortState.dir === 'asc' ? result : -result;
    });
  }, [empleadosBaseFiltrados, columnFilters, sortState]);

  const columns = useMemo<DataTableColumn<EmpleadoERPRead>[]>(() => [
    {
      key: 'cedula',
      label: 'Cédula',
      minWidth: '130px',
      filterable: true,
      render: (empleado) => (
        <Text as="span" variant="caption" className="font-mono font-semibold text-[var(--color-primary)]">
          {empleado.cedula}
        </Text>
      ),
    },
    {
      key: 'nombre_cargo',
      label: 'Nombre / Cargo',
      minWidth: '280px',
      flex: true,
      filterable: true,
      render: (empleado) => (
        <div className="min-w-0">
          <Text variant="body2" weight="medium" className="truncate">
            {empleado.nombre ?? '(sin nombre)'}
          </Text>
          <Text variant="caption" className="truncate text-[var(--color-text-secondary)]">
            {empleado.cargo ?? 'Sin cargo'}
          </Text>
        </div>
      ),
    },
    {
      key: 'area',
      label: 'Área',
      minWidth: '180px',
      filterable: true,
      render: (empleado) => <Text variant="caption" className="truncate">{empleado.area ?? '—'}</Text>,
    },
    {
      key: 'ciudadcontratacion',
      label: 'Ciudad contratación',
      minWidth: '180px',
      filterable: true,
      render: (empleado) => <Text variant="caption" className="truncate">{empleado.ciudadcontratacion ?? '—'}</Text>,
    },
    {
      key: 'quien_reporta',
      label: 'Reporta a',
      minWidth: '200px',
      filterable: true,
      render: (empleado) => <Text variant="caption" className="truncate">{empleado.quien_reporta ?? '—'}</Text>,
    },
    {
      key: 'autoriza_he',
      label: 'Autoriza HE',
      minWidth: '130px',
      centered: true,
      filterable: true,
      render: (empleado) => (
        empleado.autoriza_he === true ? (
          <Badge size="xs" variant="success">SI</Badge>
        ) : empleado.autoriza_he === false ? (
          <Badge size="xs" variant="warning">NO</Badge>
        ) : (
          <Badge size="xs" variant="default">Sin dato</Badge>
        )
      ),
    },
    {
      key: 'estado_he',
      label: 'Estado',
      minWidth: '170px',
      centered: true,
      filterable: true,
      render: (empleado) => (
        empleado.autoriza_he === true ? (
          <Badge size="xs" variant="info">Disponible</Badge>
        ) : (
          <Badge size="xs" variant="warning">No disponible para HE</Badge>
        )
      ),
    },
  ], []);

  const setColumnFilter = (columnKey: string, filter: Set<string>) => {
    setColumnFilters((prev) => ({ ...prev, [columnKey]: filter }));
  };

  const setSort = (key: string, dir: 'asc' | 'desc' | null) => {
    setSortState(dir ? { key, dir } : null);
  };

  const filtrosActivos = Object.values(columnFilters).filter((filter) => filter.size > 0).length;
  const hayFiltrosActivos = filtrosActivos > 0 || busqueda.trim().length > 0 || filtroAutoriza !== 'si' || !!sortState?.dir;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAutoriza('si');
    setColumnFilters({});
    setSortState(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/service-portal/horas-extras')}
            className="!p-2 !rounded-full shrink-0"
            aria-label="Volver al planificador"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Title level={2} className="!m-0">Empleados activos</Title>
            <Text className="mt-1 text-[var(--color-text-secondary)]">
              Consulta empleados del ERP, valida autorización HE y filtra por cédula, nombre, cargo, área o ciudad.
            </Text>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">{empleados.length} activos únicos</Badge>
          <Badge variant="default">{empleadosFiltrados.length} visibles</Badge>
        </div>
      </div>

      <MaterialCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por cédula, nombre, cargo, área o ciudad..."
              className="pl-9"
            />
          </div>
          <Select
            value={filtroAutoriza}
            onChange={(e) => {
              setFiltroAutoriza(e.target.value);
              setColumnFilters({});
            }}
            options={FILTRO_AUTORIZA_OPTIONS}
            className="lg:w-56"
          />
          <Button variant="ghost" onClick={limpiarFiltros} disabled={!hayFiltrosActivos}>
            Limpiar filtros{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
          </Button>
        </div>
      </MaterialCard>

      {error && (
        <MaterialCard className="p-4 border-red-200 bg-red-100 dark:bg-red-900/20" role="alert">
          <Text className="text-red-800 dark:text-red-300">{error}</Text>
        </MaterialCard>
      )}

      <MaterialCard className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary)]" />
            <Text className="font-semibold">Listado de empleados</Text>
          </div>
          <Text className="text-xs text-[var(--color-text-secondary)]">
            Usa los encabezados para ordenar o filtrar por columna.
          </Text>
        </div>

        <DataTable<EmpleadoERPRead>
          columns={columns}
          data={empleadosFiltrados}
          keyExtractor={(empleado) => empleado.cedula}
          columnFilters={columnFilters}
          columnOptions={columnOptions}
          onFilterChange={setColumnFilter}
          activeSortKey={sortState?.key ?? null}
          activeSortDir={sortState?.dir ?? null}
          onSort={setSort}
          isLoading={cargando}
          loadingMessage="Consultando empleados del ERP..."
          emptyMessage="No hay empleados que coincidan con los filtros actuales."
          emptyIcon={
            <div className="p-4 rounded-full bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]">
              <Users size={32} />
            </div>
          }
          maxHeight="max-h-[640px]"
          minHeight="min-h-[260px]"
          className="border-none shadow-none"
        />
      </MaterialCard>
    </div>
  );
};

export default EmpleadosActivosView;
