/**
 * SelectorEmpleados — Paso 1 del planificador semanal.
 *
 * Lista virtualizada simple (sin react-window) con búsqueda contra el ERP
 * y selección múltiple. Limita la selección a 200 empleados para evitar
 * respuestas enormes al backend.
 */
import React, { useEffect, useState } from 'react';
import { Input, Button, Text, Spinner, Checkbox, MaterialCard, Badge } from '../../../../../components/atoms';
import { Search, ChevronDown } from 'lucide-react';
import { buscarEmpleadosERP } from '../../../../../services/horasExtrasService';
import type { EmpleadoERPRead } from '../../../../../types/horasExtras';

const MAX_SELECCION = 200;
const LIMITE_PAGINA = 50;

interface SelectorEmpleadosProps {
  token: string;
  seleccionados: Set<string>;
  onToggle: (cedula: string) => void;
  onToggleEmpleado?: (empleado: EmpleadoERPRead) => void;
  onIncluirEmpleados?: (empleados: EmpleadoERPRead[]) => void;
  onLimpiar: () => void;
  errorCarga?: string | null;
}

const SelectorEmpleados: React.FC<SelectorEmpleadosProps> = ({
  token,
  seleccionados,
  onToggle,
  onToggleEmpleado,
  onIncluirEmpleados,
  onLimpiar,
  errorCarga,
}) => {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<EmpleadoERPRead[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(errorCarga ?? null);
  const [erpDisponible, setErpDisponible] = useState(true);

  useEffect(() => {
    if (errorCarga !== undefined) setError(errorCarga);
  }, [errorCarga]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) {
        setItems([]);
        setError(null);
        return;
      }
      cargar(q);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const cargar = async (query: string) => {
    setCargando(true);
    setError(null);
    try {
      const r = await buscarEmpleadosERP(query || undefined, LIMITE_PAGINA, 0, token, true);
      setItems(r.items);
      setErpDisponible(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al consultar ERP';
      setItems([]);
      if (msg.includes('503') || msg.includes('no disponible')) {
        setErpDisponible(false);
      }
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const incluirTodos = () => {
    const seleccionables = items.filter((it) => it.autoriza_he === true);
    if (onIncluirEmpleados) {
      onIncluirEmpleados(seleccionables);
      return;
    }
    seleccionables.forEach((it) => {
      if (!seleccionados.has(it.cedula) && seleccionados.size < MAX_SELECCION) {
        onToggle(it.cedula);
      }
    });
  };

  const handleToggle = (empleado: EmpleadoERPRead) => {
    if (empleado.autoriza_he !== true) return;
    if (onToggleEmpleado) {
      onToggleEmpleado(empleado);
      return;
    }
    onToggle(empleado.cedula);
  };

  return (
    <MaterialCard className="p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
        <div>
          <Text className="font-semibold block">Empleados</Text>
          <Text className="text-xs text-[var(--color-text-secondary)]">
            Busca por cedula o nombre y marca quienes van a trabajar en la semana.
          </Text>
        </div>
        <Badge variant="primary" size="sm">
          {seleccionados.size} / {MAX_SELECCION} seleccionados
        </Badge>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <Input
            type="text"
            placeholder="Buscar por cédula o nombre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
            disabled={!erpDisponible}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={incluirTodos}
          disabled={items.length === 0 || !erpDisponible}
          className="whitespace-nowrap"
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          Incluir visibles
        </Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar} className="whitespace-nowrap">
          Limpiar
        </Button>
      </div>

      {error && (
        <Text as="div" className="mb-2 p-2 rounded-xl bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-sm">
          {erpDisponible
            ? error
            : 'Conexión con ERP no disponible. Intenta nuevamente o valida el servicio ERP antes de seleccionar empleados.'}
        </Text>
      )}

      {cargando ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)]">
          {items.length === 0 && !error && (
            <Text as="div" className="py-3 text-center text-sm text-[var(--color-text-secondary)]">Sin resultados</Text>
          )}
          {items.map((emp) => (
            <Text as="div" key={emp.cedula} className="py-2 px-3 flex items-center gap-3 hover:bg-[var(--color-surface-variant)] transition-colors">
              <Checkbox
                checked={seleccionados.has(emp.cedula)}
                onChange={() => handleToggle(emp)}
                disabled={emp.autoriza_he !== true || (!seleccionados.has(emp.cedula) && seleccionados.size >= MAX_SELECCION)}
                label=""
                aria-label={`Seleccionar ${emp.cedula}`}
              />
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium truncate block">
                  {emp.cedula} — {emp.nombre ?? '(sin nombre)'}
                </Text>
                <Text className="text-xs text-[var(--color-text-secondary)] block">
                  {emp.cargo ?? '—'} · {emp.area ?? '—'}
                  {emp.autoriza_he === true && ' · autoriza HE'}
                  {emp.autoriza_he === false && ' · no autoriza HE'}
                  {emp.autoriza_he === null && ' · sin dato HE'}
                </Text>
              </div>
            </Text>
          ))}
        </div>
      )}
    </MaterialCard>
  );
};

export default SelectorEmpleados;
