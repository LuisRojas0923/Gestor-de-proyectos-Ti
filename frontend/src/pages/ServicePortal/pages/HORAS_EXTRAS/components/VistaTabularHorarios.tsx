import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardPenLine } from 'lucide-react';
import { Button, MaterialCard, Text, Textarea } from '../../../../../components/atoms';
import { DataTable, type DataTableColumn } from '../../../../../components/molecules/DataTable';
import type { EmpleadoERPRead, PlanDiaIn } from '../../../../../types/horasExtrasPlanificador';
import { calcularHorasTurno } from '../utils/planificadorSemanalUtils';
import { fechaIsoCorta, labelDia } from '../utils/horarioUtils';

interface EmpleadoPlanTabular {
  cedula: string;
  empleado?: EmpleadoERPRead;
  dias: PlanDiaIn[];
}

interface FilaHorarioTabular {
  id: string; cedula: string; empleado: string; fecha: string; dia: string;
  cliente: string; actividad: string; orden: string; cc: string;
  entrada: string; almuerzo: string; salida: string; total: string;
  observaciones: string; diaSemana: number;
}

const FILAS_POR_PAGINA = 100;
const CLAVES_FILTRABLES = [
  'cedula', 'empleado', 'fecha', 'dia', 'cliente', 'actividad', 'orden', 'cc',
  'entrada', 'almuerzo', 'salida', 'total', 'observaciones',
] as const;

interface VistaTabularHorariosProps {
  empleados: EmpleadoPlanTabular[];
  fechasSemana: Date[];
  diasDestino: Set<number>;
  onEditarDia: (cedula: string, diaSemana: number) => void;
  onAplicarActividad: (actividad: string) => void;
}

const minutosComoHora = (minutos: number): string => (
  `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`
);
const horasComoHora = (horas: number): string => minutosComoHora(Math.round(horas * 60));
const unirValores = (valores: Array<string | null | undefined>, vacio: string): string => {
  const unicos = Array.from(new Set(
    valores.map((valor) => valor?.trim()).filter((valor): valor is string => Boolean(valor)),
  ));
  return unicos.join(', ') || vacio;
};
const observacionesDia = (dia: PlanDiaIn): string => dia.novedades
  .map((novedad) => [novedad.codigo_novedad, novedad.observaciones].filter(Boolean).join(': '))
  .join(' · ');

const VistaTabularHorarios: React.FC<VistaTabularHorariosProps> = ({
  empleados, fechasSemana, diasDestino, onEditarDia, onAplicarActividad,
}) => {
  const [actividad, setActividad] = useState('');
  const [filtros, setFiltros] = useState<Record<string, Set<string>>>({});
  const [orden, setOrden] = useState<{ key: string; dir: 'asc' | 'desc' } | null>({ key: 'cedula', dir: 'asc' });
  const [pagina, setPagina] = useState(1);
  const filas = useMemo<FilaHorarioTabular[]>(() => empleados.flatMap((empleado) => (
    empleado.dias
      .filter((dia) => dia.hora_entrada || dia.hora_salida || dia.actividad || dia.novedades.length > 0 || dia.asignaciones_ot.length > 0)
      .map((dia) => {
        const asignaciones = dia.asignaciones_ot;
        return {
          id: `${empleado.cedula}-${dia.dia_semana}`,
          cedula: empleado.cedula,
          empleado: empleado.empleado?.nombre ?? 'Sin nombre',
          fecha: fechaIsoCorta(fechasSemana[dia.dia_semana - 1]),
          dia: labelDia(dia.dia_semana),
          cliente: unirValores(asignaciones.map((asignacion) => asignacion.cliente), 'Sin cliente'),
          actividad: dia.actividad?.trim() || 'Sin actividad',
          orden: unirValores(asignaciones.map((asignacion) => asignacion.orden), 'Sin OT'),
          cc: unirValores(asignaciones.map((asignacion) => asignacion.cc), 'Sin CC'),
          entrada: dia.hora_entrada ?? '—',
          almuerzo: minutosComoHora(dia.minutos_almuerzo),
          salida: dia.hora_salida ?? '—',
          total: horasComoHora(calcularHorasTurno(
            dia.hora_entrada, dia.hora_salida, dia.minutos_almuerzo, dia.cruza_medianoche,
          )),
          observaciones: observacionesDia(dia) || '—',
          diaSemana: dia.dia_semana,
        };
      })
  )), [empleados, fechasSemana]);
  const opciones = useMemo(() => {
    const resultado: Record<string, string[]> = {};
    for (const key of CLAVES_FILTRABLES) {
      resultado[key] = Array.from(new Set(filas.map((fila) => String(fila[key])))).sort();
    }
    return resultado;
  }, [filas]);
  useEffect(() => {
    setFiltros((actuales) => {
      let cambio = false;
      const siguientes: Record<string, Set<string>> = {};
      for (const [key, valores] of Object.entries(actuales)) {
        const permitidos = new Set(opciones[key] ?? []);
        const validos = new Set(Array.from(valores).filter((valor) => permitidos.has(valor)));
        if (validos.size !== valores.size) cambio = true;
        if (validos.size > 0) siguientes[key] = validos;
      }
      return cambio ? siguientes : actuales;
    });
  }, [opciones]);
  const filasVisibles = useMemo(() => {
    const filtradas = filas.filter((fila) => Object.entries(filtros).every(([key, valores]) => (
      valores.size === 0 || valores.has(String(fila[key as keyof FilaHorarioTabular]))
    )));
    if (!orden) return filtradas;
    return [...filtradas].sort((a, b) => {
      let resultado = String(a[orden.key as keyof FilaHorarioTabular]).localeCompare(
        String(b[orden.key as keyof FilaHorarioTabular]), 'es', { numeric: true },
      );
      if (resultado === 0 && orden.key === 'cedula') resultado = a.fecha.localeCompare(b.fecha);
      return orden.dir === 'asc' ? resultado : -resultado;
    });
  }, [filas, filtros, orden]);
  const totalPaginas = Math.max(1, Math.ceil(filasVisibles.length / FILAS_POR_PAGINA));
  const filasPagina = useMemo(() => filasVisibles.slice(
    (pagina - 1) * FILAS_POR_PAGINA,
    pagina * FILAS_POR_PAGINA,
  ), [filasVisibles, pagina]);
  const filtrosActivos = Object.values(filtros).filter((valores) => valores.size > 0).length;
  const editarFila = useCallback(
    (fila: FilaHorarioTabular) => onEditarDia(fila.cedula, fila.diaSemana),
    [onEditarDia],
  );
  const renderAccionFila = useCallback((fila: FilaHorarioTabular) => (
    <Button
      variant="ghost"
      size="xs"
      aria-label={`Editar ${fila.empleado}, ${fila.fecha}`}
      onClick={(event) => { event.stopPropagation(); editarFila(fila); }}
    >
      Editar
    </Button>
  ), [editarFila]);
  useEffect(() => setPagina((actual) => Math.min(actual, totalPaginas)), [totalPaginas]);
  const columns = useMemo<DataTableColumn<FilaHorarioTabular>[]>(() => [
    {
      key: 'empleado',
      label: 'Empleado / cédula',
      minWidth: '240px',
      filterable: true,
      flex: true,
      subFilters: [
        { key: 'empleado', label: 'Nombre' },
        { key: 'cedula', label: 'Cédula' },
      ],
      render: (fila) => (
        <div className="flex min-w-0 flex-col gap-0.5 py-1 text-left">
          <Text className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{fila.empleado}</Text>
          <Text className="truncate font-mono text-[11px] text-[var(--color-text-secondary)]">{fila.cedula}</Text>
        </div>
      ),
    },
    { key: 'fecha', label: 'Fecha', minWidth: '110px', filterable: true },
    { key: 'dia', label: 'Día', minWidth: '72px', filterable: true },
    {
      key: 'orden',
      label: 'OS / OT / cliente',
      minWidth: '210px',
      filterable: true,
      flex: true,
      subFilters: [
        { key: 'orden', label: 'OS / OT' },
        { key: 'cliente', label: 'Cliente' },
      ],
      render: (fila) => (
        <div className="flex min-w-0 flex-col gap-0.5 py-1 text-left">
          <Text className="truncate font-mono text-xs font-semibold text-[var(--color-text-primary)]">{fila.orden}</Text>
          <Text className="truncate text-[11px] text-[var(--color-text-secondary)]">{fila.cliente}</Text>
        </div>
      ),
    },
    {
      key: 'actividad', label: 'Actividad / observación', minWidth: '280px', filterable: true, flex: true,
      render: (fila) => <Text className="line-clamp-2 text-xs font-medium text-[var(--color-text-primary)]">{fila.actividad}</Text>,
    },
    { key: 'cc', label: 'CC costo', minWidth: '95px', centered: true, filterable: true },
    { key: 'entrada', label: 'Entrada', minWidth: '90px', centered: true, filterable: true },
    { key: 'almuerzo', label: 'Almuerzo', minWidth: '90px', centered: true, filterable: true },
    { key: 'salida', label: 'Salida', minWidth: '90px', centered: true, filterable: true },
    { key: 'total', label: 'Total laborado', minWidth: '115px', centered: true, filterable: true },
    { key: 'observaciones', label: 'Novedades', minWidth: '160px', flex: true, filterable: true },
  ], []);

  return (
    <MaterialCard className="overflow-visible p-0">
      <div className="border-b border-[var(--color-border)] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 lg:max-w-sm">
            <Text className="font-semibold text-[var(--color-text-primary)]">Horario detallado por empleado</Text>
            <Text className="text-xs text-[var(--color-text-secondary)]">Ordenado por cédula y fecha. Selecciona una fila para editar el día completo.</Text>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:max-w-3xl">
            <Textarea
              aria-label="Actividad para los días seleccionados"
              value={actividad}
              onChange={(event) => setActividad(event.target.value)}
              placeholder="Actividad u observación para los días seleccionados"
              maxLength={500}
              rows={2}
              className="min-h-[52px] min-w-0 flex-1 text-xs"
            />
            <Button
              variant="primary" size="sm" icon={ClipboardPenLine}
              disabled={!actividad.trim() || empleados.length === 0 || diasDestino.size === 0}
              onClick={() => onAplicarActividad(actividad.trim())}
              className="shrink-0 self-stretch sm:self-auto"
            >
              Aplicar actividad
            </Button>
          </div>
        </div>
        <Text className="mt-2 text-[11px] text-[var(--color-text-secondary)] lg:text-right">
          Se aplica a todos los empleados seleccionados en los días marcados, incluso si hay filtros activos.
        </Text>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <Text className="text-xs text-[var(--color-text-secondary)]">{filasVisibles.length} jornadas</Text>
        {filtrosActivos > 0 && (
          <Button variant="ghost" size="xs" onClick={() => { setFiltros({}); setPagina(1); }}>
            Limpiar filtros ({filtrosActivos})
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={filasPagina}
        keyExtractor={(fila) => fila.id}
        onRowClick={editarFila}
        renderRowActions={renderAccionFila}
        actionsMinWidth="80px"
        columnFilters={filtros}
        columnOptions={opciones}
        onFilterChange={(key, values) => { setFiltros((prev) => ({ ...prev, [key]: values })); setPagina(1); }}
        activeSortKey={orden?.key ?? null}
        activeSortDir={orden?.dir ?? null}
        onSort={(key, dir) => { setOrden(dir ? { key, dir } : null); setPagina(1); }}
        emptyMessage="No hay horarios programados para la selección."
        maxHeight="max-h-[620px]"
        minHeight="min-h-[260px]"
        className="border-none shadow-none"
      />
      {totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-3 py-2">
          <Button variant="ghost" size="xs" disabled={pagina === 1} onClick={() => setPagina((actual) => actual - 1)}>Anterior</Button>
          <Text className="text-xs text-[var(--color-text-secondary)]">Página {pagina} de {totalPaginas}</Text>
          <Button variant="ghost" size="xs" disabled={pagina === totalPaginas} onClick={() => setPagina((actual) => actual + 1)}>Siguiente</Button>
        </div>
      )}
    </MaterialCard>
  );
};

export default VistaTabularHorarios;
