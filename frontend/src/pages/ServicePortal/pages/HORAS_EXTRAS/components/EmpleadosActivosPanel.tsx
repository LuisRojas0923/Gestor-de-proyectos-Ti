import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Badge, Button, Checkbox, MaterialCard, Text } from '../../../../../components/atoms';
import Callout from '../../../../../components/molecules/Callout';
import { DataTable, type DataTableColumn } from '../../../../../components/molecules/DataTable';
import { buscarEmpleadosERP } from '../../../../../services/horasExtrasService';
import type { EmpleadoERPRead, PlanDiaIn, PlanPreCalculoResponse } from '../../../../../types/horasExtras';
import { labelDia } from '../utils/horarioUtils';

const LIMITE_PAGINA = 100;
const MAX_PAGINAS = 20;
const MAX_FILAS_RENDER = 300;
const COLUMNAS_FILTRABLES = ['nombre', 'cedula', 'cargo', 'area', 'ciudadcontratacion', 'quien_reporta', 'autoriza_he', 'estado_he'];

interface EmpleadosActivosPanelProps {
  seleccionados: Set<string>;
  empleadosInfo: Map<string, EmpleadoERPRead>;
  maxSeleccion: number;
  diasSemana: number[];
  defaultDias: PlanDiaIn[];
  overrides: Map<string, PlanDiaIn[]>;
  preCalculo?: PlanPreCalculoResponse | null;
  errores?: Map<string, string>;
  onSelectionChange: (seleccionados: Set<string>, empleadosInfo: Map<string, EmpleadoERPRead>) => void;
  onCeldaClick: (cedula: string, diaSemana: number) => void;
}

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
  const valor = empleado[key as keyof EmpleadoERPRead];
  return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
};

const colorHE = (he: number): string => {
  if (he <= 0) return 'bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]';
  if (he <= 2) return 'bg-[var(--color-primary-light)]/30 text-[var(--color-primary)]';
  return 'bg-[var(--color-primary)] text-[var(--color-surface)]';
};

const FilaDatoCompacta: React.FC<{ etiqueta: string; valor: string; mono?: boolean }> = ({ etiqueta, valor, mono }) => (
  <div className="flex min-w-0 items-center gap-1 truncate !text-[10px]" title={`${etiqueta}: ${valor}`}>
    <Text variant="caption" className="w-[52px] shrink-0 font-semibold !text-[10px] leading-tight text-[var(--color-text-secondary)]">
      {etiqueta}:
    </Text>
    <Text
      variant="caption"
      weight="bold"
      className={`truncate !text-[10px] leading-tight ${mono ? 'font-mono text-[var(--color-primary)]' : ''}`}
    >
      {valor}
    </Text>
  </div>
);

const EmpleadosActivosPanel: React.FC<EmpleadosActivosPanelProps> = ({
  seleccionados,
  empleadosInfo,
  maxSeleccion,
  diasSemana,
  defaultDias,
  overrides,
  preCalculo,
  errores,
  onSelectionChange,
  onCeldaClick,
}) => {
  const token = localStorage.getItem('token') || '';
  const [empleados, setEmpleados] = useState<EmpleadoERPRead[]>([]);
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

  const columnOptions = useMemo(() => {
    return COLUMNAS_FILTRABLES.reduce<Record<string, string[]>>((acc, key) => {
      acc[key] = Array.from(new Set(empleados.map((empleado) => empleadoValorColumna(empleado, key))))
        .sort((a, b) => a.localeCompare(b, 'es'));
      return acc;
    }, {});
  }, [empleados]);

  const empleadosFiltrados = useMemo(() => {
    const filtrados = empleados.filter((empleado) => {
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
  }, [empleados, columnFilters, sortState]);

  const empleadosRenderizados = useMemo(
    () => empleadosFiltrados.slice(0, MAX_FILAS_RENDER),
    [empleadosFiltrados],
  );

  const empleadosVisiblesSeleccionables = useMemo(() => {
    return empleadosRenderizados.filter((empleado) => empleado.autoriza_he === true && !seleccionados.has(empleado.cedula));
  }, [empleadosRenderizados, seleccionados]);

  const idxPreCalculo = useMemo(() => {
    const dias = new Map<string, Map<number, number>>();
    const totales = new Map<string, { he: number; costo: number }>();
    if (!preCalculo) return { dias, totales };
    for (const empleado of preCalculo.empleados) {
      const inner = new Map<number, number>();
      for (const dia of empleado.detalle_por_dia) inner.set(dia.dia_semana, dia.horas_extras);
      dias.set(empleado.cedula, inner);
      totales.set(empleado.cedula, {
        he: empleado.total_horas_extras,
        costo: empleado.total_costo_estimado,
      });
    }
    return { dias, totales };
  }, [preCalculo]);

  const puedeSeleccionarEmpleado = useCallback((empleado: EmpleadoERPRead) => {
    if (seleccionados.has(empleado.cedula)) return true;
    return empleado.autoriza_he === true && seleccionados.size < maxSeleccion;
  }, [maxSeleccion, seleccionados]);

  const toggleEmpleado = useCallback((empleado: EmpleadoERPRead) => {
    if (!puedeSeleccionarEmpleado(empleado)) return;
    const nextSeleccionados = new Set(seleccionados);
    const nextEmpleadosInfo = new Map(empleadosInfo);

    if (nextSeleccionados.has(empleado.cedula)) {
      nextSeleccionados.delete(empleado.cedula);
      nextEmpleadosInfo.delete(empleado.cedula);
    } else {
      nextSeleccionados.add(empleado.cedula);
      nextEmpleadosInfo.set(empleado.cedula, empleado);
    }
    onSelectionChange(nextSeleccionados, nextEmpleadosInfo);
  }, [empleadosInfo, onSelectionChange, puedeSeleccionarEmpleado, seleccionados]);

  const incluirVisibles = () => {
    const nextSeleccionados = new Set(seleccionados);
    const nextEmpleadosInfo = new Map(empleadosInfo);
    for (const empleado of empleadosRenderizados) {
      if (empleado.autoriza_he !== true || nextSeleccionados.size >= maxSeleccion) continue;
      nextSeleccionados.add(empleado.cedula);
      nextEmpleadosInfo.set(empleado.cedula, empleado);
    }
    onSelectionChange(nextSeleccionados, nextEmpleadosInfo);
  };

  const limpiarSeleccion = () => {
    onSelectionChange(new Set(), new Map());
  };

  const columns = useMemo<DataTableColumn<EmpleadoERPRead>[]>(() => [
    {
      key: 'seleccionar',
      label: 'Sel.',
      minWidth: '72px',
      centered: true,
      render: (empleado) => (
        <Checkbox
          checked={seleccionados.has(empleado.cedula)}
          onChange={() => toggleEmpleado(empleado)}
          disabled={!puedeSeleccionarEmpleado(empleado)}
          label=""
          aria-label={`${seleccionados.has(empleado.cedula) ? 'Quitar' : 'Seleccionar'} ${empleado.cedula}${empleado.nombre ? ` - ${empleado.nombre}` : ''}`}
        />
      ),
    },
    {
      key: 'nombre',
      label: 'Empleado',
      minWidth: '320px',
      flex: true,
      filterable: true,
      subFilters: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'cedula', label: 'Cédula' },
        { key: 'cargo', label: 'Cargo' },
      ],
      render: (empleado) => (
        <div className="flex min-w-0 flex-col gap-0.5 py-1 text-left">
          <FilaDatoCompacta etiqueta="Nombre" valor={empleado.nombre ?? '(sin nombre)'} />
          <FilaDatoCompacta etiqueta="Cédula" valor={empleado.cedula} mono />
          <FilaDatoCompacta etiqueta="Cargo" valor={empleado.cargo ?? 'Sin cargo'} />
        </div>
      ),
    },
    {
      key: 'area',
      label: 'Operación',
      minWidth: '250px',
      filterable: true,
      subFilters: [
        { key: 'area', label: 'Área' },
        { key: 'ciudadcontratacion', label: 'Ciudad' },
        { key: 'quien_reporta', label: 'Reporta a' },
      ],
      render: (empleado) => (
        <div className="flex min-w-0 flex-col gap-0.5 py-1 text-left">
          <FilaDatoCompacta etiqueta="Área" valor={empleado.area ?? 'Área no disponible'} />
          <FilaDatoCompacta etiqueta="Ciudad" valor={empleado.ciudadcontratacion ?? 'Ciudad no disponible'} />
          <FilaDatoCompacta etiqueta="Reporta" valor={empleado.quien_reporta ?? 'No disponible'} />
        </div>
      ),
    },
    {
      key: 'autoriza_he',
      label: 'HE',
      minWidth: '145px',
      centered: true,
      filterable: true,
      subFilters: [
        { key: 'autoriza_he', label: 'Autoriza HE' },
        { key: 'estado_he', label: 'Estado HE' },
      ],
      render: (empleado) => {
        if (empleado.autoriza_he === true) {
          return (
            <div className="flex flex-col items-center gap-1">
              <Badge size="xs" variant="success">Autoriza</Badge>
              <Badge size="xs" variant="info">Disponible</Badge>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge size="xs" variant={empleado.autoriza_he === false ? 'warning' : 'default'}>
              {empleado.autoriza_he === false ? 'No autoriza' : 'Sin dato'}
            </Badge>
            <Badge size="xs" variant="warning">No disponible</Badge>
          </div>
        );
      },
    },
    ...diasSemana.map<DataTableColumn<EmpleadoERPRead>>((diaSemana) => ({
      key: `dia_${diaSemana}`,
      label: labelDia(diaSemana),
      minWidth: '105px',
      centered: true,
      render: (empleado) => {
        const estaSeleccionado = seleccionados.has(empleado.cedula);
        const diasEmpleado = overrides.get(empleado.cedula) ?? defaultDias;
        const dia = diasEmpleado.find((item) => item.dia_semana === diaSemana);
        const he = idxPreCalculo.dias.get(empleado.cedula)?.get(diaSemana) ?? 0;
        const calculado = idxPreCalculo.dias.has(empleado.cedula);
        return (
          <Button
            type="button"
            variant="custom"
            disabled={!estaSeleccionado}
            onClick={() => onCeldaClick(empleado.cedula, diaSemana)}
            aria-label={estaSeleccionado ? `Editar ${labelDia(diaSemana)} de ${empleado.cedula}` : `Selecciona ${empleado.cedula} para editar ${labelDia(diaSemana)}`}
            className={`w-full min-h-[58px] rounded-xl border border-[var(--color-border)] px-2 py-1 text-[var(--color-text-primary)] transition-all ${
              estaSeleccionado
                ? `${calculado ? colorHE(he) : 'bg-[var(--color-surface)]'} hover:border-[var(--color-primary)] active:scale-[0.98]`
                : 'bg-[var(--color-surface-variant)]/40 text-[var(--color-text-secondary)] opacity-70'
            }`}
          >
            <Text as="span" className="block text-center text-[10px] leading-tight font-semibold">
              {dia?.hora_entrada?.slice(0, 5) ?? '—'}/{dia?.hora_salida?.slice(0, 5) ?? '—'}
            </Text>
            <Text as="span" className="block text-center text-[10px] opacity-70">{dia?.minutos_almuerzo ?? 0}m</Text>
            {dia && dia.novedades.length > 0 && (
              <Badge className="!text-[9px] !px-1 !py-0 mt-0.5">
                {dia.novedades[0].codigo_novedad}
              </Badge>
            )}
            {calculado && he > 0 && <Text as="span" className="block text-center text-[10px] font-semibold mt-0.5">+{he.toFixed(1)}h</Text>}
          </Button>
        );
      },
    })),
    {
      key: 'total_he',
      label: 'Total HE',
      minWidth: '90px',
      centered: true,
      render: (empleado) => {
        const total = idxPreCalculo.totales.get(empleado.cedula);
        return <Text className="font-semibold">{total ? `${total.he.toFixed(1)}h` : '—'}</Text>;
      },
    },
    {
      key: 'costo',
      label: 'Costo',
      minWidth: '120px',
      render: (empleado) => {
        const total = idxPreCalculo.totales.get(empleado.cedula);
        return <Text className="w-full text-right font-semibold">{total ? `$${Math.round(total.costo).toLocaleString('es-CO')}` : '—'}</Text>;
      },
    },
    {
      key: 'estado_plan',
      label: 'Estado plan',
      minWidth: '130px',
      centered: true,
      render: (empleado) => {
        const error = errores?.get(empleado.cedula);
        const esDuplicado = error?.includes('ya tiene un cálculo registrado') ?? false;
        if (!seleccionados.has(empleado.cedula)) return <Badge size="xs" variant="default">Sin seleccionar</Badge>;
        if (esDuplicado) return <Badge size="xs" variant="warning">Ya existe</Badge>;
        if (error) return <Badge size="xs" variant="error">Error</Badge>;
        if (preCalculo) return <Badge size="xs" variant="success">Calculado</Badge>;
        return <Badge size="xs" variant="default">Pendiente</Badge>;
      },
    },
  ], [defaultDias, diasSemana, errores, idxPreCalculo, onCeldaClick, overrides, preCalculo, puedeSeleccionarEmpleado, seleccionados, toggleEmpleado]);

  const setColumnFilter = (columnKey: string, filter: Set<string>) => {
    setColumnFilters((prev) => ({ ...prev, [columnKey]: filter }));
  };

  const filtrosActivos = Object.values(columnFilters).filter((filter) => filter.size > 0).length;
  const hayFiltrosActivos = filtrosActivos > 0 || !!sortState?.dir;

  const limpiarFiltros = () => {
    setColumnFilters({});
    setSortState(null);
  };

  return (
    <MaterialCard className="overflow-hidden border-[var(--color-primary)]/15 p-0" aria-label="Tabla unificada de empleados y horarios">
      <div className="border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Users className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <Text className="shrink-0 font-semibold">Empleados y horarios</Text>
            <Text className="hidden text-xs text-[var(--color-text-secondary)] md:block">
              Selecciona empleados y programa sus horarios en la misma tabla.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Badge variant="primary">{empleados.length} activos</Badge>
              <Badge variant="default">
                {empleadosFiltrados.length > empleadosRenderizados.length
                  ? `${empleadosRenderizados.length} / ${empleadosFiltrados.length} visibles`
                  : `${empleadosRenderizados.length} visibles`}
              </Badge>
              <Badge variant="info">{seleccionados.size} / {maxSeleccion} seleccionados</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button variant="secondary" size="sm" onClick={incluirVisibles} disabled={empleadosVisiblesSeleccionables.length === 0 || seleccionados.size >= maxSeleccion}>
                Incluir visibles
              </Button>
              <Button variant="ghost" size="sm" onClick={limpiarSeleccion} disabled={seleccionados.size === 0}>
                Limpiar selección
              </Button>
              {hayFiltrosActivos && (
                <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                  Limpiar filtros{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-[var(--color-border)] p-3">
          <Callout variant="error" role="alert" className="!rounded-xl">
            {error}
          </Callout>
        </div>
      )}

      <DataTable<EmpleadoERPRead>
        columns={columns}
        data={empleadosRenderizados}
        keyExtractor={(empleado) => empleado.cedula}
        columnFilters={columnFilters}
        columnOptions={columnOptions}
        onFilterChange={setColumnFilter}
        activeSortKey={sortState?.key ?? null}
        activeSortDir={sortState?.dir ?? null}
        onSort={(key, dir) => setSortState(dir ? { key, dir } : null)}
        isLoading={cargando}
        loadingMessage="Consultando empleados del ERP..."
        emptyMessage="No hay empleados que coincidan con los filtros actuales."
        emptyIcon={
          <div className="p-4 rounded-full bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]">
            <Users size={32} />
          </div>
        }
        maxHeight="max-h-[620px]"
        minHeight="min-h-[320px]"
        className="border-none shadow-none"
      />
    </MaterialCard>
  );
};

export default EmpleadosActivosPanel;
