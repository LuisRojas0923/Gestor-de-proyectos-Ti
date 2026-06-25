import React, { useState, useMemo } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { Button, Input, Select, Subtitle, Text } from '../../../../../components/atoms';
import { NominaTable, ColumnDef } from '../../../../../components/organisms/NominaTable';
import type { AreaRP, CargoRP, AprobadorRP } from '../../RequisicionPersonal/types/requisicion.types';

interface CargosTabProps {
  cargos: CargoRP[];
  loadingCargos: boolean;
  areas: AreaRP[];
  aprobadores: AprobadorRP[];
  onCrearCargo: (areaId: number, nombre: string, superiorId: number | null) => Promise<void>;
  onActualizarCargo: (id: number, data: { nombre?: string; activo?: boolean; cargo_superior_id?: number | null }) => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

interface CargoTableData extends CargoRP {
  area_nombre: string;
  director_nombre: string;
}

const CargosTab: React.FC<CargosTabProps> = ({
  cargos,
  loadingCargos,
  areas,
  aprobadores,
  onCrearCargo,
  onActualizarCargo,
  setErrorMsg,
  setSuccessMsg,
}) => {
  // --- Estados del Formulario (Crear) ---
  const [nuevoCargoNombre, setNuevoCargoNombre] = useState('');
  const [nuevoCargoAreaId, setNuevoCargoAreaId] = useState<string>('');
  const [nuevoCargoSuperiorId, setNuevoCargoSuperiorId] = useState<string>('');
  const [mostrarTodosDirectoresNuevo, setMostrarTodosDirectoresNuevo] = useState(false);

  // --- Estados del Formulario (Editar) ---
  const [editingCargo, setEditingCargo] = useState<CargoTableData | null>(null);
  const [editCargoNombre, setEditCargoNombre] = useState('');
  const [editCargoAreaId, setEditCargoAreaId] = useState<string>('');
  const [editCargoSuperiorId, setEditCargoSuperiorId] = useState<string>('');
  const [mostrarTodosDirectoresEdit, setMostrarTodosDirectoresEdit] = useState(false);

  // --- Filtros e Interfaz ---
  const [filtroArea, setFiltroArea] = useState<string>('todos');
  const [searchText, setSearchText] = useState('');

  const getAreaNombre = (areaId: number) => {
    const area = areas.find((a) => a.id === areaId);
    return area ? area.nombre : `Área ${areaId}`;
  };

  const getDirectorNombre = (aprobadorId?: number | null) => {
    if (!aprobadorId) return 'Ninguno';
    const aprobador = aprobadores.find((a) => a.id === aprobadorId);
    return aprobador
      ? `${aprobador.nombre_aprobador} (${getAreaNombre(aprobador.area_id)})`
      : `Director ${aprobadorId}`;
  };

  const handleCrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCargoNombre.trim() || !nuevoCargoAreaId) return;
    try {
      setErrorMsg(null);
      const supId = nuevoCargoSuperiorId ? Number(nuevoCargoSuperiorId) : null;
      await onCrearCargo(Number(nuevoCargoAreaId), nuevoCargoNombre.trim(), supId);
      setNuevoCargoNombre('');
      setNuevoCargoSuperiorId('');
      setMostrarTodosDirectoresNuevo(false);
      setSuccessMsg('Cargo creado exitosamente');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear cargo');
    }
  };

  const handleActualizarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCargo) return;
    try {
      setErrorMsg(null);
      const supId = editCargoSuperiorId ? Number(editCargoSuperiorId) : null;
      await onActualizarCargo(editingCargo.id, {
        nombre: editCargoNombre.trim(),
        activo: editingCargo.activo,
        cargo_superior_id: supId,
      });
      setEditingCargo(null);
      setSuccessMsg('Cargo actualizado exitosamente');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar cargo');
    }
  };

  const handleToggleEstado = async (cargo: CargoRP) => {
    try {
      setErrorMsg(null);
      await onActualizarCargo(cargo.id, { activo: !cargo.activo });
      setSuccessMsg(`Estado del cargo modificado exitosamente`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al modificar estado del cargo');
    }
  };

  // --- Filtrado local ---
  const cargosFiltrados = useMemo<CargoTableData[]>(() => {
    return cargos
      .filter((c) => {
        if (filtroArea === 'todos') return true;
        return c.area_id === Number(filtroArea);
      })
      .map((c) => ({
        ...c,
        area_nombre: getAreaNombre(c.area_id),
        director_nombre: getDirectorNombre(c.cargo_superior_id),
      }));
  }, [cargos, filtroArea, areas, aprobadores]);

  // --- Definición de Columnas ---
  const columns = useMemo<ColumnDef<CargoTableData>[]>(() => [
    {
      header: 'Cargo',
      accessorKey: 'nombre',
      align: 'left',
      cell: (row) => <Text weight="semibold" className="text-slate-800 dark:text-slate-200 uppercase">{row.nombre}</Text>,
    },
    {
      header: 'Área',
      accessorKey: 'area_nombre',
      align: 'left',
      cell: (row) => <Text as="span" className="text-sm text-slate-600 dark:text-slate-400 uppercase">{row.area_nombre}</Text>,
    },
    {
      header: 'Reporta a Director',
      accessorKey: 'director_nombre',
      align: 'left',
      cell: (row) => (
        <Text as="span" className="text-sm text-indigo-700 dark:text-indigo-400 font-medium uppercase">
          {row.director_nombre}
        </Text>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      align: 'center',
      cell: (row) => (
        <Text as="span" className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.activo
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
        }`}>
          <Text as="span" className={`w-1.5 h-1.5 rounded-full ${row.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {row.activo ? 'Activo' : 'Inactivo'}
        </Text>
      ),
    },
    {
      header: 'Acciones',
      accessorKey: 'acciones',
      align: 'right',
      enableColumnFilter: false,
      cell: (row) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCargo(row);
              setEditCargoNombre(row.nombre);
              setEditCargoAreaId(String(row.area_id));
              setEditCargoSuperiorId(row.cargo_superior_id ? String(row.cargo_superior_id) : '');
              setMostrarTodosDirectoresEdit(false);
            }}
            icon={Edit2}
          />
          <Button
            variant="ghost"
            size="sm"
            className={row.activo ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}
            onClick={() => handleToggleEstado(row)}
          >
            {row.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ], [areas, aprobadores, onActualizarCargo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario Crear/Editar Cargo */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 h-fit space-y-4">
        <Subtitle weight="bold" className="text-slate-800 dark:text-slate-200">
          {editingCargo ? 'Editar Cargo' : 'Nuevo Cargo'}
        </Subtitle>
        {editingCargo ? (
          <form onSubmit={handleActualizarSubmit} className="space-y-4">
            <Input
              label="Nombre del Cargo"
              value={editCargoNombre}
              onChange={(e) => setEditCargoNombre(e.target.value)}
              required
            />
            <div>
              <Select
                label="Reporta a Director"
                value={editCargoSuperiorId}
                onChange={(e) => setEditCargoSuperiorId(e.target.value)}
                options={[
                  { value: '', label: 'Ninguno' },
                  ...aprobadores
                    .filter((a) => {
                      if (!a.activo) return false;
                      if (mostrarTodosDirectoresEdit || !editCargoAreaId) return true;
                      return a.area_id === Number(editCargoAreaId);
                    })
                    .map((a) => ({
                      value: String(a.id),
                      label: `${a.nombre_aprobador} (${getAreaNombre(a.area_id)})`,
                    })),
                ]}
              />
              {editCargoAreaId && (
                <Button
                  type="button"
                  onClick={() => setMostrarTodosDirectoresEdit((v) => !v)}
                  className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline transition-colors block"
                >
                  {mostrarTodosDirectoresEdit ? '← Ver solo los del área' : '🔍 Ver directores de otras áreas'}
                </Button>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 justify-center">
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setEditingCargo(null)} className="flex-1 justify-center">
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCrearSubmit} className="space-y-4">
            <Input
              label="Nombre del Cargo"
              value={nuevoCargoNombre}
              onChange={(e) => setNuevoCargoNombre(e.target.value)}
              placeholder="Ej. Auxiliar de Cuentas por Cobrar"
              required
            />
            <div>
              <Select
                label="Área Asociada"
                value={nuevoCargoAreaId}
                onChange={(e) => {
                  setNuevoCargoAreaId(e.target.value);
                  setMostrarTodosDirectoresNuevo(false);
                }}
                required
                options={[
                  { value: '', label: 'Seleccione un área...' },
                  ...areas
                    .filter((a) => a.activo)
                    .map((a) => ({
                      value: String(a.id),
                      label: a.nombre,
                    })),
                ]}
              />
            </div>
            <div>
              <Select
                label="Reporta a Director"
                value={nuevoCargoSuperiorId}
                onChange={(e) => setNuevoCargoSuperiorId(e.target.value)}
                options={[
                  { value: '', label: 'Ninguno' },
                  ...aprobadores
                    .filter((a) => {
                      if (!a.activo) return false;
                      if (mostrarTodosDirectoresNuevo || !nuevoCargoAreaId) return true;
                      return a.area_id === Number(nuevoCargoAreaId);
                    })
                    .map((a) => ({
                      value: String(a.id),
                      label: `${a.nombre_aprobador} (${getAreaNombre(a.area_id)})`,
                    })),
                ]}
              />
              {nuevoCargoAreaId && (
                <Button
                  type="button"
                  onClick={() => setMostrarTodosDirectoresNuevo((v) => !v)}
                  className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline transition-colors block"
                >
                  {mostrarTodosDirectoresNuevo ? '← Ver solo los del área' : '🔍 Ver directores de otras áreas'}
                </Button>
              )}
            </div>
            <div className="pt-2">
              <Button type="submit" icon={Plus} className="w-full justify-center">
                Crear Cargo
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Listado de Cargos */}
      <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4 pb-2 border-b border-[var(--color-border)]/50">
          <Subtitle weight="bold" className="text-slate-800 dark:text-slate-200 uppercase">CARGOS EXISTENTES</Subtitle>
          {/* Filtro por Área */}
          <div className="flex items-center gap-2">
            <Text size="xs" color="secondary" className="font-semibold uppercase tracking-wider">
              Filtrar por Área:
            </Text>
            <Select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              size="xs"
              className="w-48"
              options={[
                { value: 'todos', label: 'Todas las Áreas' },
                ...areas.map((a) => ({ value: String(a.id), label: a.nombre })),
              ]}
            />
          </div>
        </div>

        {loadingCargos ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
          </div>
        ) : cargosFiltrados.length === 0 ? (
          <div className="h-32 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl">
            <Text color="secondary">No hay cargos registrados en este filtro.</Text>
          </div>
        ) : (
          <NominaTable
            data={cargosFiltrados}
            columns={columns}
            globalFilterText={searchText}
            onGlobalFilterChange={setSearchText}
            hideExport
          />
        )}
      </div>
    </div>
  );
};

export default CargosTab;
