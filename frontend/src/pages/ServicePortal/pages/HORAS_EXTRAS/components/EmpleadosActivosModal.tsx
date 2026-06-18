import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { Button, Badge, Checkbox, Input, Select, Spinner, Text } from '../../../../../components/atoms';
import Modal from '../../../../../components/molecules/Modal';
import { buscarEmpleadosERP } from '../../../../../services/horasExtrasService';
import type { EmpleadoERPRead } from '../../../../../types/horasExtras';

const LIMITE_PAGINA = 100;
const MAX_PAGINAS = 20;
const FILTRO_AUTORIZA_OPTIONS = [
  { value: 'si', label: 'Autorizado HE: SI' },
  { value: 'todos', label: 'Autorizado HE: Todos' },
  { value: 'no', label: 'Autorizado HE: NO' },
];

interface EmpleadosActivosModalProps {
  abierto: boolean;
  token: string;
  seleccionados: Set<string>;
  onCerrar: () => void;
  onAgregar: (empleados: EmpleadoERPRead[]) => void;
}

const deduplicarEmpleados = (empleados: EmpleadoERPRead[]): EmpleadoERPRead[] => {
  const porCedula = new Map<string, EmpleadoERPRead>();
  empleados.forEach((empleado) => {
    const cedula = empleado.cedula.trim();
    if (!porCedula.has(cedula)) porCedula.set(cedula, { ...empleado, cedula });
  });
  return Array.from(porCedula.values());
};

const EmpleadosActivosModal: React.FC<EmpleadosActivosModalProps> = ({
  abierto,
  token,
  seleccionados,
  onCerrar,
  onAgregar,
}) => {
  const [empleados, setEmpleados] = useState<EmpleadoERPRead[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroAutoriza, setFiltroAutoriza] = useState('si');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;

    const cargarEmpleados = async () => {
      setCargando(true);
      setError(null);
      setMarcados(new Set());
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

        setEmpleados(deduplicarEmpleados(acumulado));
      } catch (e: unknown) {
        setEmpleados([]);
        setError(e instanceof Error ? e.message : 'Error al consultar empleados activos');
      } finally {
        setCargando(false);
      }
    };

    cargarEmpleados();
  }, [abierto, token]);

  const empleadosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((empleado) => {
      if (filtroAutoriza === 'si' && empleado.autoriza_he !== true) return false;
      if (filtroAutoriza === 'no' && empleado.autoriza_he !== false) return false;
      if (!q) return true;
      return [empleado.cedula, empleado.nombre, empleado.cargo, empleado.area, empleado.quien_reporta]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(q));
    });
  }, [empleados, busqueda, filtroAutoriza]);

  const seleccionablesVisibles = empleadosFiltrados.filter(
    (empleado) => empleado.autoriza_he === true && !seleccionados.has(empleado.cedula),
  );

  const toggleEmpleado = (empleado: EmpleadoERPRead) => {
    if (empleado.autoriza_he !== true || seleccionados.has(empleado.cedula)) return;
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(empleado.cedula)) next.delete(empleado.cedula);
      else next.add(empleado.cedula);
      return next;
    });
  };

  const seleccionarVisibles = () => {
    setMarcados((prev) => {
      const next = new Set(prev);
      seleccionablesVisibles.forEach((empleado) => next.add(empleado.cedula));
      return next;
    });
  };

  const agregarMarcados = () => {
    const empleadosMarcados = empleados.filter((empleado) => marcados.has(empleado.cedula));
    onAgregar(empleadosMarcados);
    onCerrar();
  };

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title="Empleados activos"
      size="full"
      className="max-w-6xl"
      contentClassName="!p-4"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Text className="font-semibold block">Seleccionar empleados del establecimiento</Text>
            <Text className="text-sm text-[var(--color-text-secondary)]">
              Se listan empleados activos del ERP y se eliminan duplicados por cédula.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary" size="sm">{marcados.size} marcados</Badge>
            <Badge variant="default" size="sm">{empleados.length} activos únicos</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por cédula, nombre, cargo o área..."
              className="pl-9"
            />
          </div>
          <Select
            value={filtroAutoriza}
            onChange={(e) => setFiltroAutoriza(e.target.value)}
            options={FILTRO_AUTORIZA_OPTIONS}
            className="md:w-56"
          />
          <Button variant="secondary" onClick={seleccionarVisibles} disabled={seleccionablesVisibles.length === 0}>
            Seleccionar visibles
          </Button>
          <Button variant="ghost" onClick={() => setMarcados(new Set())} disabled={marcados.size === 0}>
            Limpiar
          </Button>
        </div>

        {error && (
          <Text as="div" className="rounded-xl bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 p-3 text-sm">
            {error}
          </Text>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-auto max-h-[520px]">
          {cargando ? (
            <div className="flex justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : (
            <table className="w-full min-w-[1050px] text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-[var(--deep-navy)] text-white text-xs uppercase">
                <tr>
                  <th className="px-3 py-3 text-left w-12">Sel.</th>
                  <th className="px-3 py-3 text-left">Cédula</th>
                  <th className="px-3 py-3 text-left">Nombre</th>
                  <th className="px-3 py-3 text-left">Cargo</th>
                  <th className="px-3 py-3 text-left">Área</th>
                  <th className="px-3 py-3 text-left">Reporta a</th>
                  <th className="px-3 py-3 text-center">Autoriza HE</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {empleadosFiltrados.map((empleado) => {
                  const yaAgregado = seleccionados.has(empleado.cedula);
                  const noAutorizado = empleado.autoriza_he !== true;
                  return (
                    <tr key={empleado.cedula} className="hover:bg-[var(--color-surface-variant)] transition-colors">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={marcados.has(empleado.cedula) || yaAgregado}
                          onChange={() => toggleEmpleado(empleado)}
                          disabled={yaAgregado || noAutorizado}
                          label=""
                          aria-label={`Seleccionar ${empleado.cedula}`}
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">{empleado.cedula}</td>
                      <td className="px-3 py-3">{empleado.nombre ?? '(sin nombre)'}</td>
                      <td className="px-3 py-3">{empleado.cargo ?? '—'}</td>
                      <td className="px-3 py-3">{empleado.area ?? '—'}</td>
                      <td className="px-3 py-3">{empleado.quien_reporta ?? '—'}</td>
                      <td className="px-3 py-3 text-center">
                        {empleado.autoriza_he === true ? (
                          <Badge size="xs" variant="success">SI</Badge>
                        ) : empleado.autoriza_he === false ? (
                          <Badge size="xs" variant="warning">NO</Badge>
                        ) : (
                          <Badge size="xs" variant="default">Sin dato</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {yaAgregado ? (
                          <Badge size="xs" variant="info">Agregado</Badge>
                        ) : noAutorizado ? (
                          <Badge size="xs" variant="warning">No autoriza HE</Badge>
                        ) : (
                          <Badge size="xs" variant="success">Disponible</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {empleadosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--color-text-secondary)]">
                      Sin empleados para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button variant="primary" onClick={agregarMarcados} disabled={marcados.size === 0}>
            <UserPlus className="w-4 h-4 mr-1" />
            Agregar seleccionados
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmpleadosActivosModal;
