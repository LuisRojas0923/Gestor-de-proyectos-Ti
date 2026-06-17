/**
 * SelectorEmpleados — Paso 1 del planificador semanal.
 *
 * Lista virtualizada simple (sin react-window) con búsqueda contra el ERP
 * y selección múltiple. Limita la selección a 200 empleados para evitar
 * respuestas enormes al backend.
 */
import React, { useEffect, useState } from 'react';
import { Input, Button, Text, Spinner, Checkbox } from '../../../../../components/atoms';
import { Search, ChevronDown } from 'lucide-react';
import { buscarEmpleadosERP } from '../../../../../services/horasExtrasService';
import type { EmpleadoERPRead } from '../../../../../types/horasExtras';

const MAX_SELECCION = 200;
const LIMITE_PAGINA = 50;

interface SelectorEmpleadosProps {
  token: string;
  seleccionados: Set<string>;
  onToggle: (cedula: string) => void;
  onLimpiar: () => void;
  errorCarga?: string | null;
}

const SelectorEmpleados: React.FC<SelectorEmpleadosProps> = ({
  token,
  seleccionados,
  onToggle,
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
      if (msg.includes('503') || msg.includes('no disponible')) {
        setErpDisponible(false);
      }
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const incluirTodos = () => {
    items.forEach((it) => {
      if (!seleccionados.has(it.cedula) && seleccionados.size < MAX_SELECCION) {
        onToggle(it.cedula);
      }
    });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <Text className="font-semibold">Paso 1 — Selecciona empleados del ERP</Text>
        <Text className="text-xs text-slate-500">
          {seleccionados.size} / {MAX_SELECCION} seleccionados
        </Text>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
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
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          Incluir visibles
        </Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          Limpiar
        </Button>
      </div>

      {error && (
        <div className="mb-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {erpDisponible
            ? error
            : 'Conexión con ERP no disponible. Digite las cédulas manualmente en el campo de notas.'}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
          {items.length === 0 && !error && (
            <li className="py-3 text-center text-sm text-slate-500">Sin resultados</li>
          )}
          {items.map((emp) => (
            <li key={emp.cedula} className="py-2 flex items-center gap-3">
              <Checkbox
                checked={seleccionados.has(emp.cedula)}
                onChange={() => onToggle(emp.cedula)}
                disabled={!seleccionados.has(emp.cedula) && seleccionados.size >= MAX_SELECCION}
                label=""
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {emp.cedula} — {emp.nombre ?? '(sin nombre)'}
                </div>
                <div className="text-xs text-slate-500">
                  {emp.cargo ?? '—'} · {emp.area ?? '—'}
                  {emp.nivel_riesgo_arl && ` · ARL ${emp.nivel_riesgo_arl}`}
                  {emp.autoriza_he === true && ' · autoriza HE'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SelectorEmpleados;
