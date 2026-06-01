import React, { useState, useMemo } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { Subtitle, Text, Input, Button } from '../../../../../components/atoms';
import { NominaTable, ColumnDef } from '../../../../../components/organisms/NominaTable';
import type { AreaRP } from '../../RequisicionPersonal/types/requisicion.types';

interface AreasTabProps {
  areas: AreaRP[];
  loadingAreas: boolean;
  onCrearArea: (nombre: string) => Promise<void>;
  onActualizarArea: (area: AreaRP, nuevoNombre: string, activo: boolean) => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

const AreasTab: React.FC<AreasTabProps> = ({
  areas,
  loadingAreas,
  onCrearArea,
  onActualizarArea,
  setErrorMsg,
  setSuccessMsg
}) => {
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState('');
  const [editingArea, setEditingArea] = useState<AreaRP | null>(null);
  const [editAreaNombre, setEditAreaNombre] = useState('');
  const [searchText, setSearchText] = useState('');

  const handleCrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAreaNombre.trim()) return;
    try {
      setErrorMsg(null);
      await onCrearArea(nuevaAreaNombre.trim());
      setNuevaAreaNombre('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear área');
    }
  };

  const handleGuardarEdit = async (area: AreaRP) => {
    if (!editAreaNombre.trim()) return;
    try {
      setErrorMsg(null);
      await onActualizarArea(area, editAreaNombre.trim(), area.activo);
      setEditingArea(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar área');
    }
  };

  const handleToggleActivo = async (area: AreaRP) => {
    try {
      setErrorMsg(null);
      await onActualizarArea(area, area.nombre, !area.activo);
      setSuccessMsg(`Área ${!area.activo ? 'activada' : 'desactivada'} exitosamente`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado del área');
    }
  };

  const columns = useMemo<ColumnDef<AreaRP>[]>(() => [
    {
      header: 'ID',
      accessorKey: 'id',
      align: 'center',
      cell: (row) => <span className="font-mono text-slate-400 dark:text-slate-500">#{row.id}</span>,
    },
    {
      header: 'Área',
      accessorKey: 'nombre',
      align: 'left',
      cell: (row) => (
        editingArea?.id === row.id ? (
          <Input
            value={editAreaNombre}
            onChange={(e) => setEditAreaNombre(e.target.value)}
            size="xs"
            className="w-full"
            autoFocus
          />
        ) : (
          <Text weight="semibold" className="text-slate-800 dark:text-slate-200">{row.nombre}</Text>
        )
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      align: 'center',
      cell: (row) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.activo
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${row.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      accessorKey: 'acciones',
      align: 'right',
      enableColumnFilter: false,
      cell: (row) => (
        editingArea?.id === row.id ? (
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={() => handleGuardarEdit(row)}>
              Guardar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingArea(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditingArea(row); setEditAreaNombre(row.nombre); }}
              icon={Edit2}
            />
            <Button
              variant="ghost"
              size="sm"
              className={row.activo ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}
              onClick={() => handleToggleActivo(row)}
            >
              {row.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        )
      ),
    }
  ], [editingArea, editAreaNombre, onActualizarArea]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario Crear Área */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 h-fit space-y-4">
        <Subtitle weight="bold" className="text-slate-800 dark:text-slate-200">Nueva Área</Subtitle>
        <form onSubmit={handleCrearSubmit} className="space-y-4">
          <Input
            label="Nombre del Área"
            value={nuevaAreaNombre}
            onChange={(e) => setNuevaAreaNombre(e.target.value)}
            placeholder="Ej. CONTABILIDAD"
            required
          />
          <Button type="submit" icon={Plus} className="w-full justify-center">
            Crear Área
          </Button>
        </form>
      </div>

      {/* Listado de Áreas */}
      <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <Subtitle weight="bold" className="text-slate-800 dark:text-slate-200">Áreas Existentes</Subtitle>
        {loadingAreas ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
          </div>
        ) : areas.length === 0 ? (
          <div className="h-32 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl">
            <Text color="secondary">No hay áreas registradas.</Text>
          </div>
        ) : (
          <NominaTable
            data={areas}
            columns={columns}
            globalFilterText={searchText}
            onGlobalFilterChange={setSearchText}
            exportFileName="areas_empresa.csv"
          />
        )}
      </div>
    </div>
  );
};

export default AreasTab;
