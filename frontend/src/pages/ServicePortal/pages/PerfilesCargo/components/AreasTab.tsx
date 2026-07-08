import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { Button, Input, Subtitle, Text, Badge } from '../../../../../components/atoms';
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

  const handleGuardarEdit = useCallback(async (area: AreaRP) => {
    if (!editAreaNombre.trim()) {
      setErrorMsg('El nombre del área no puede estar vacío');
      return;
    }
    try {
      setErrorMsg(null);
      await onActualizarArea(area, editAreaNombre.trim(), area.activo);
      setEditingArea(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar área');
    }
  }, [editAreaNombre, onActualizarArea, setErrorMsg]);

  const handleToggleActivo = useCallback(async (area: AreaRP) => {
    try {
      setErrorMsg(null);
      await onActualizarArea(area, area.nombre, !area.activo);
      setSuccessMsg(`Área ${!area.activo ? 'activada' : 'desactivada'} exitosamente`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado del área');
    }
  }, [onActualizarArea, setErrorMsg, setSuccessMsg]);

  const columns = useMemo<ColumnDef<AreaRP>[]>(() => [
    {
      header: 'ID',
      accessorKey: 'id',
      align: 'center',
      cell: (row) => <Text as="span" className="font-mono text-slate-400 dark:text-slate-500">#{row.id}</Text>,
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
            className="w-full"
            autoFocus
          />
        ) : (
          <Text weight="medium" className="text-slate-800 dark:text-slate-200">{row.nombre}</Text>
        )
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      align: 'center',
      cell: (row) => (
        <Badge
          variant={row.activo ? 'success' : 'surface'}
          className={row.activo ? '' : 'text-slate-500 dark:text-slate-400'}
        >
          {row.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      accessorKey: 'id',
      align: 'center',
      cell: (row) => (
        editingArea?.id === row.id ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" onClick={() => handleGuardarEdit(row)}>
              Guardar
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setEditingArea(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => {
              setEditingArea(row);
              setEditAreaNombre(row.nombre);
            }}>
              Editar
            </Button>
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
  ], [editingArea, editAreaNombre, handleGuardarEdit, handleToggleActivo]);

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
            hideExport
          />
        )}
      </div>
    </div>
  );
};

export default AreasTab;
