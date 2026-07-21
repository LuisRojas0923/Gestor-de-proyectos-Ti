import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select } from '../../../../components/atoms';
import { DataTable } from '../../../../components/molecules/DataTable';
import Callout from '../../../../components/molecules/Callout';
import { ArrowLeft, Search, RefreshCw, Database } from 'lucide-react';
import { listarCalculosPlanilla } from '../../../../services/horasExtrasPlanillaService';
import type { CalculoPlanilla } from '../../../../types/horasExtrasPlanilla';
import { useColumnFilters } from '../../../../hooks/useColumnFilters';
import {
  CALCULO_PLANILLA_ACCESSORS,
  CALCULO_PLANILLA_COLUMNS,
} from './calculoPlanillaColumns';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});
const fmtCurrency = (n: number) => currencyFormatter.format(n);

const fmtHours = (n: number) => `${Number(n).toFixed(2)} h`;
const BLOQUE_FILAS = 100;

interface ResumenCardProps {
  label: string;
  value: string | number;
}

const ResumenCard: React.FC<ResumenCardProps> = ({ label, value }) => (
  <MaterialCard className="min-h-[88px] p-3 text-center">
    <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">
      {label}
    </Text>
    <Text variant="h5" weight="bold" className="mt-1 text-[var(--color-text-primary)]">
      {value}
    </Text>
  </MaterialCard>
);

const CalculoListView: React.FC = () => {
  const navigate = useNavigate();

  const [cedula, setCedula] = useState('');
  const [anio, setAnio] = useState<number | ''>('');
  const [estado, setEstado] = useState('');
  const [filas, setFilas] = useState<CalculoPlanilla[]>([]);
  const [limiteFilas, setLimiteFilas] = useState(BLOQUE_FILAS);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const {
    filters: columnFilters,
    filteredData,
    cascadingOptions,
    setColumnFilter,
    activeFilterCount,
    clearAllFilters,
  } = useColumnFilters(filas, CALCULO_PLANILLA_ACCESSORS);

  const cargar = async () => {
    setCargando(true);
    setError('');
    setFilas([]);
    setLimiteFilas(BLOQUE_FILAS);
    try {
      const r = await listarCalculosPlanilla(
        {
          cedula: cedula.trim() || undefined,
          anio: anio === '' ? undefined : Number(anio),
          estado: estado || undefined,
          limit: 100,
        },
        localStorage.getItem('token') || '',
      );
      setFilas(r);
    } catch {
      setFilas([]);
      setError('No fue posible consultar los cálculos. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const buscar = () => {
    limpiarFiltros();
    void cargar();
  };

  const limpiarFiltros = () => {
    setLimiteFilas(BLOQUE_FILAS);
    clearAllFilters();
  };

  const cambiarFiltro = (key: string, values: Set<string>) => {
    setLimiteFilas(BLOQUE_FILAS);
    setColumnFilter(key, values);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHoras = filteredData.reduce((total, fila) => total + Number(fila.cantidad_horas || 0), 0);
  const costoEmpresa = filteredData.reduce((total, fila) => total + Number(fila.costo_total || 0), 0);
  const empleados = new Set(filteredData.map((fila) => fila.cedula)).size;
  const filasRenderizadas = filteredData.slice(0, limiteFilas);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-2 sm:px-4 lg:h-[calc(100vh-170px)] lg:overflow-hidden">
      <div className="flex flex-none flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/service-portal/tiempo-asistencia')}
            className="!h-10 !w-10 !rounded-full !p-2"
            aria-label="Volver a Tiempo y Asistencia"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <Title variant="h4" weight="bold" className="truncate">CÁLCULOS DE HORAS EXTRAS</Title>
            <Text variant="caption" color="text-secondary">HISTORIAL / TRAZABILIDAD SEMANAL</Text>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <MaterialCard className="flex-none p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Opcional"
          />
          <Input
            label="Año"
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Todos"
          />
          <Select
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'BORRADOR', label: 'Borrador' },
              { value: 'PENDIENTE_AUTORIZACION', label: 'Pendiente de autorización' },
              { value: 'CONFIRMADO', label: 'Confirmado' },
              { value: 'PAGADO', label: 'Pagado' },
              { value: 'COMPENSADO', label: 'Compensado' },
              { value: 'ANULADO', label: 'Anulado' },
            ]}
          />
          <div className="flex items-end">
            <Button onClick={buscar} disabled={cargando} fullWidth>
              <Search className="mr-2 h-4 w-4" />
              {cargando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>
      </MaterialCard>

      {error && (
        <Callout variant="error" role="alert" title="No fue posible cargar los cálculos" className="flex-none">
          <Text variant="body2" color="inherit">{error}</Text>
          <Button variant="outline" size="sm" onClick={cargar}>Reintentar</Button>
        </Callout>
      )}

      {!error && (
        <div className="contents">
          <div className="grid flex-none grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Resumen de registros filtrados">
            <ResumenCard label="Registros filtrados" value={filteredData.length} />
            <ResumenCard label="Empleados filtrados" value={empleados} />
            <ResumenCard label="Horas registradas" value={fmtHours(totalHoras)} />
            <ResumenCard label="Costo calculado" value={fmtCurrency(costoEmpresa)} />
          </div>

          <div className="flex min-h-[320px] flex-col overflow-hidden rounded-xl lg:min-h-0 lg:flex-1">
            <div className="flex flex-none items-center justify-between gap-2 border-x border-t border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Database className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
                <Text variant="caption" color="text-secondary" weight="bold" className="truncate uppercase tracking-wider">
                  Registros por empleado · hasta 100 cálculos consultados
                </Text>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={limpiarFiltros}
                  aria-label={`Limpiar ${activeFilterCount} filtros`}
                >
                  Limpiar filtros ({activeFilterCount})
                </Button>
              )}
            </div>
            <DataTable
              columns={CALCULO_PLANILLA_COLUMNS}
              data={filasRenderizadas}
              keyExtractor={(fila) => fila.fila_id}
              onRowClick={(fila) => navigate(`/service-portal/horas-extras/calculos/${fila.calculo_id}`)}
              isLoading={cargando}
              loadingMessage="Consultando cálculos..."
              emptyMessage="No hay cálculos para los filtros seleccionados."
              minHeight="min-h-[260px]"
              maxHeight="max-h-[70vh] lg:max-h-none"
              className="min-h-0 flex-1 rounded-b-xl"
              columnFilters={columnFilters}
              columnOptions={cascadingOptions}
              onFilterChange={cambiarFiltro}
            />
            {filteredData.length > BLOQUE_FILAS && (
              <div className="flex flex-none items-center justify-between gap-3 border-x border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <Text variant="caption" color="text-secondary">
                  Mostrando {filasRenderizadas.length} de {filteredData.length} registros
                </Text>
                {filasRenderizadas.length < filteredData.length && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setLimiteFilas((actual) => actual + BLOQUE_FILAS)}
                  >
                    Cargar más registros
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculoListView;
