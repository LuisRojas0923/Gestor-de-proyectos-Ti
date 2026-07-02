import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { Badge, Button, Checkbox, MaterialCard, Text } from '../../../../../components/atoms';
import Callout from '../../../../../components/molecules/Callout';
import { DataTable, type DataTableColumn } from '../../../../../components/molecules/DataTable';
import { buscarEmpleadosERP } from '../../../../../services/horasExtrasService';
import type { EmpleadoERPRead, PlanDiaIn, PlanPreCalculoResponse } from '../../../../../types/horasExtrasPlanificador';
import { labelDia } from '../utils/horarioUtils';
import {
  COLUMNAS_FILTRABLES,
  FilaDatoCompacta,
  LIMITE_PAGINA,
  colorHE,
  deduplicarEmpleados,
  empleadoValorColumna,
  type EmpleadoTablaRow,
  type EmpleadoTablaRowCacheEntry,
} from './empleadosActivosTableUtils';

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
  const [cargandoMas, setCargandoMas] = useState(false);
  const [offsetEmpleados, setOffsetEmpleados] = useState(0);
  const [totalEmpleados, setTotalEmpleados] = useState(0);
  const [hayMasEmpleados, setHayMasEmpleados] = useState(false);
  const [busquedaFiltro, setBusquedaFiltro] = useState('');
  const [busquedaRemota, setBusquedaRemota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const seleccionadosRef = useRef(seleccionados);
  const empleadosInfoRef = useRef(empleadosInfo);
  const rowCacheRef = useRef(new Map<string, EmpleadoTablaRowCacheEntry>());
  const tablaBodyRef = useRef<HTMLDivElement>(null);
  const cargandoMasRef = useRef(false);

  useEffect(() => {
    seleccionadosRef.current = seleccionados;
    empleadosInfoRef.current = empleadosInfo;
  }, [empleadosInfo, seleccionados]);

  useEffect(() => {
    cargandoMasRef.current = cargandoMas;
  }, [cargandoMas]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusquedaRemota(busquedaFiltro.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [busquedaFiltro]);

  useEffect(() => {
    let cancelado = false;

    const cargarEmpleadosIniciales = async () => {
      setCargando(true);
      setCargandoMas(false);
      setError(null);
      try {
        const respuesta = await buscarEmpleadosERP(busquedaRemota || undefined, LIMITE_PAGINA, 0, token, true);
        if (!cancelado) {
          const nextOffset = respuesta.offset + respuesta.items.length;
          setEmpleados(deduplicarEmpleados(respuesta.items));
          setTotalEmpleados(respuesta.total);
          setOffsetEmpleados(nextOffset);
          setHayMasEmpleados(nextOffset < respuesta.total && respuesta.items.length > 0);
        }
      } catch (e: unknown) {
        if (!cancelado) {
          setEmpleados([]);
          setTotalEmpleados(0);
          setOffsetEmpleados(0);
          setHayMasEmpleados(false);
          setError(e instanceof Error ? e.message : 'Error al consultar empleados activos');
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarEmpleadosIniciales();
    return () => {
      cancelado = true;
    };
  }, [busquedaRemota, token]);

  const cargarMasEmpleados = useCallback(async () => {
    if (cargando || cargandoMasRef.current || !hayMasEmpleados) return;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    setError(null);
    try {
      const respuesta = await buscarEmpleadosERP(busquedaRemota || undefined, LIMITE_PAGINA, offsetEmpleados, token, true);
      const nextOffset = respuesta.offset + respuesta.items.length;
      setEmpleados((prev) => deduplicarEmpleados([...prev, ...respuesta.items]));
      setTotalEmpleados(respuesta.total);
      setOffsetEmpleados(nextOffset);
      setHayMasEmpleados(nextOffset < respuesta.total && respuesta.items.length > 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al consultar más empleados activos');
    } finally {
      cargandoMasRef.current = false;
      setCargandoMas(false);
    }
  }, [busquedaRemota, cargando, hayMasEmpleados, offsetEmpleados, token]);

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

  const empleadosRenderizados = empleadosFiltrados;

  useEffect(() => {
    const body = tablaBodyRef.current;
    if (!body) return;
    const handleScroll = () => {
      const distanciaAlFinal = body.scrollHeight - body.scrollTop - body.clientHeight;
      if (distanciaAlFinal < 180) cargarMasEmpleados();
    };
    body.addEventListener('scroll', handleScroll, { passive: true });
    return () => body.removeEventListener('scroll', handleScroll);
  }, [cargarMasEmpleados, empleadosRenderizados.length]);

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

  const filasRenderizadas = useMemo(() => {
    const previous = rowCacheRef.current;
    const nextCache = new Map<string, EmpleadoTablaRowCacheEntry>();
    const rows = empleadosRenderizados.map((empleado) => {
      const seleccionadoEnPlan = seleccionados.has(empleado.cedula);
      const puedeSeleccionarse = seleccionadoEnPlan || (empleado.autoriza_he === true && seleccionados.size < maxSeleccion);
      const diasPlan = overrides.get(empleado.cedula) ?? defaultDias;
      const hePorDia = idxPreCalculo.dias.get(empleado.cedula);
      const totalPlan = idxPreCalculo.totales.get(empleado.cedula);
      const errorPlan = errores?.get(empleado.cedula);
      const calculadoPlan = !!preCalculo;
      const cached = previous.get(empleado.cedula);

      if (
        cached
        && cached.empleado === empleado
        && cached.seleccionadoEnPlan === seleccionadoEnPlan
        && cached.puedeSeleccionarse === puedeSeleccionarse
        && cached.diasPlan === diasPlan
        && cached.hePorDia === hePorDia
        && cached.totalPlan === totalPlan
        && cached.errorPlan === errorPlan
        && cached.calculadoPlan === calculadoPlan
      ) {
        nextCache.set(empleado.cedula, cached);
        return cached.row;
      }

      const row: EmpleadoTablaRow = {
        ...empleado,
        seleccionadoEnPlan,
        puedeSeleccionarse,
        diasPlan,
        hePorDia,
        totalPlan,
        errorPlan,
        calculadoPlan,
      };
      nextCache.set(empleado.cedula, {
        empleado,
        seleccionadoEnPlan,
        puedeSeleccionarse,
        diasPlan,
        hePorDia,
        totalPlan,
        errorPlan,
        calculadoPlan,
        row,
      });
      return row;
    });
    rowCacheRef.current = nextCache;
    return rows;
  }, [defaultDias, empleadosRenderizados, errores, idxPreCalculo, maxSeleccion, overrides, preCalculo, seleccionados]);

  const toggleEmpleado = useCallback((empleado: EmpleadoTablaRow) => {
    if (!empleado.puedeSeleccionarse) return;
    const nextSeleccionados = new Set(seleccionadosRef.current);
    const nextEmpleadosInfo = new Map(empleadosInfoRef.current);

    if (nextSeleccionados.has(empleado.cedula)) {
      nextSeleccionados.delete(empleado.cedula);
      nextEmpleadosInfo.delete(empleado.cedula);
    } else {
      nextSeleccionados.add(empleado.cedula);
      nextEmpleadosInfo.set(empleado.cedula, empleado);
    }
    onSelectionChange(nextSeleccionados, nextEmpleadosInfo);
  }, [onSelectionChange]);

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

  const columns = useMemo<DataTableColumn<EmpleadoTablaRow>[]>(() => [
    {
      key: 'seleccionar',
      label: 'Sel.',
      minWidth: '50px',
      centered: true,
      render: (empleado) => (
        <Checkbox
          checked={empleado.seleccionadoEnPlan}
          onChange={() => toggleEmpleado(empleado)}
          disabled={!empleado.puedeSeleccionarse}
          label=""
          aria-label={`${empleado.seleccionadoEnPlan ? 'Quitar' : 'Seleccionar'} ${empleado.cedula}${empleado.nombre ? ` - ${empleado.nombre}` : ''}`}
        />
      ),
    },
    {
      key: 'nombre',
      label: 'Empleado',
      minWidth: '280px',
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
      minWidth: '200px',
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
      minWidth: '100px',
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
    ...diasSemana.map<DataTableColumn<EmpleadoTablaRow>>((diaSemana) => ({
      key: `dia_${diaSemana}`,
      label: labelDia(diaSemana),
      minWidth: '90px',
      centered: true,
      render: (empleado) => {
        const estaSeleccionado = empleado.seleccionadoEnPlan;
        const dia = empleado.diasPlan.find((item) => item.dia_semana === diaSemana);
        const he = empleado.hePorDia?.get(diaSemana) ?? 0;
        const calculado = !!empleado.hePorDia;
        const totalOt = dia?.asignaciones_ot?.length ?? 0;
        return (
          <Button
            type="button"
            variant="custom"
            size="xs"
            disabled={!estaSeleccionado}
            onClick={() => onCeldaClick(empleado.cedula, diaSemana)}
            aria-label={estaSeleccionado ? `Editar ${labelDia(diaSemana)} de ${empleado.cedula}` : `Selecciona ${empleado.cedula} para editar ${labelDia(diaSemana)}`}
            className={`w-[65px] min-h-[52px] rounded-xl border border-[var(--color-border)] !px-2 !py-1 text-[var(--color-text-primary)] transition-all ${
              estaSeleccionado
                ? `${calculado ? colorHE(he) : 'bg-[var(--color-surface)]'} hover:border-[var(--color-primary)] active:scale-[0.98]`
                : 'bg-[var(--color-surface-variant)]/40 text-[var(--color-text-secondary)] opacity-70'
            }`}
          >
            <Text as="span" variant="caption" color="inherit" weight="semibold" className="block text-center !text-[11px] leading-tight tabular-nums tracking-[-0.01em]">
              {dia?.hora_entrada?.slice(0, 5) ?? '—'}/{dia?.hora_salida?.slice(0, 5) ?? '—'}
            </Text>
            <Text as="span" variant="caption" color="inherit" weight="medium" className="mt-0.5 block text-center !text-[10px] leading-none opacity-70 tabular-nums">{dia?.minutos_almuerzo ?? 0}m</Text>
            {dia && dia.novedades.length > 0 && (
              <Badge className="!text-[9px] !px-1 !py-0 mt-0.5">
                {dia.novedades[0].codigo_novedad}
              </Badge>
            )}
            {totalOt > 0 && (
              <Badge className="!text-[9px] !px-1 !py-0 mt-0.5">
                {totalOt} OT
              </Badge>
            )}
            {calculado && he > 0 && <Text as="span" variant="caption" color="inherit" weight="semibold" className="mt-0.5 block text-center !text-[10px] leading-none tabular-nums">+{he.toFixed(1)}h</Text>}
          </Button>
        );
      },
    })),
    {
      key: 'total_he',
      label: 'Total HE',
      minWidth: '70px',
      centered: true,
      render: (empleado) => {
        const total = empleado.totalPlan;
        return <Text className="font-semibold">{total ? `${total.he.toFixed(1)}h` : '—'}</Text>;
      },
    },
    {
      key: 'costo',
      label: 'Costo',
      minWidth: '70px',
      render: (empleado) => {
        const total = empleado.totalPlan;
        return <Text className="w-full text-right font-semibold">{total ? `$${Math.round(total.costo).toLocaleString('es-CO')}` : '—'}</Text>;
      },
    },
    {
      key: 'estado_plan',
      label: 'Estado plan',
      minWidth: '90px',
      centered: true,
      render: (empleado) => {
        const error = empleado.errorPlan;
        const esDuplicado = error?.includes('ya tiene un cálculo registrado') ?? false;
        if (!empleado.seleccionadoEnPlan) return <Badge size="xs" variant="default">Sin seleccionar</Badge>;
        if (esDuplicado) return <Badge size="xs" variant="warning">Ya existe</Badge>;
        if (error) return <Badge size="xs" variant="error">Error</Badge>;
        if (empleado.calculadoPlan) return <Badge size="xs" variant="success">Calculado</Badge>;
        return <Badge size="xs" variant="default">Pendiente</Badge>;
      },
    },
  ], [diasSemana, onCeldaClick, toggleEmpleado]);

  const setColumnFilter = (columnKey: string, filter: Set<string>) => {
    setColumnFilters((prev) => ({ ...prev, [columnKey]: filter }));
  };

  const buscarFiltroEnBaseDatos = useCallback((_columnKey: string, _subFilterKey: string, searchTerm: string) => {
    setBusquedaFiltro(searchTerm);
  }, []);

  const filtrosActivos = Object.values(columnFilters).filter((filter) => filter.size > 0).length;
  const hayBusquedaRemota = busquedaFiltro.trim().length > 0 || busquedaRemota.length > 0;
  const hayFiltrosActivos = filtrosActivos > 0 || !!sortState?.dir || hayBusquedaRemota;

  const limpiarFiltros = () => {
    setColumnFilters({});
    setSortState(null);
    setBusquedaFiltro('');
    setBusquedaRemota('');
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
              <Badge variant="primary">{empleados.length} / {totalEmpleados || empleados.length} cargados</Badge>
              <Badge variant="default">
                {empleadosFiltrados.length > empleadosRenderizados.length
                  ? `${empleadosRenderizados.length} / ${empleadosFiltrados.length} visibles`
                  : `${empleadosRenderizados.length} visibles`}
              </Badge>
              {hayMasEmpleados && <Badge variant="info">Scroll para cargar más</Badge>}
              {hayBusquedaRemota && <Badge variant="warning">Filtro BD: {busquedaRemota || busquedaFiltro}</Badge>}
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

      <DataTable<EmpleadoTablaRow>
        columns={columns}
        data={filasRenderizadas}
        keyExtractor={(empleado) => empleado.cedula}
        columnFilters={columnFilters}
        columnOptions={columnOptions}
        onFilterChange={setColumnFilter}
        remoteFilterSearch
        isFilterSearching={cargando && hayBusquedaRemota}
        onFilterSearchChange={buscarFiltroEnBaseDatos}
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
        bodyRef={tablaBodyRef}
      />
      {cargandoMas && (
        <div className="border-t border-[var(--color-border)] px-4 py-2">
          <Text className="text-center text-xs font-medium text-[var(--color-text-secondary)]">
            Cargando más empleados...
          </Text>
        </div>
      )}
    </MaterialCard>
  );
};

export default EmpleadosActivosPanel;
