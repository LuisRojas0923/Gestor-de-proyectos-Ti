import React, { useEffect, useState } from 'react';
import { X, Plus, Edit2, Check, RotateCcw, Trash2 } from 'lucide-react';
import { Button, Input, Switch, Text, Title } from '../../../../../components/atoms';
import { getTemporales, crearTemporal, actualizarTemporal, eliminarTemporal } from '../services/requisicionService';
import type { EmpresaTemporal } from '../types/requisicion.types';

interface Props {
  onClose: () => void;
  onRefreshList?: () => void;
}

const ConfigTemporalesModal: React.FC<Props> = ({ onClose, onRefreshList }) => {
  const [temporales, setTemporales] = useState<EmpresaTemporal[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [editandoActivo, setEditandoActivo] = useState(true);

  const cargar = () => {
    setLoading(true);
    getTemporales()
      .then(setTemporales)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setGuardando(true);
    try {
      await crearTemporal(nuevoNombre);
      setNuevoNombre('');
      cargar();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear empresa temporal');
    } finally {
      setGuardando(false);
    }
  };

  const handleIniciarEdicion = (temp: EmpresaTemporal) => {
    setEditandoId(temp.id);
    setEditandoNombre(temp.nombre);
    setEditandoActivo(temp.activo);
  };

  const handleGuardarEdicion = async (id: number) => {
    if (!editandoNombre.trim()) return;
    setGuardando(true);
    try {
      await actualizarTemporal(id, editandoNombre, editandoActivo);
      setEditandoId(null);
      cargar();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al actualizar empresa temporal');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
  };

  const handleEliminar = async (id: number) => {
    const confirm = window.confirm('¿Está seguro de que desea eliminar esta empresa temporal del catálogo?');
    if (!confirm) return;
    setGuardando(true);
    try {
      await eliminarTemporal(id);
      cargar();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar empresa temporal');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[var(--color-surface)] w-full max-w-xl rounded-3xl border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <Title variant="h5" weight="bold">Configuración de Temporales</Title>
            <Text variant="caption" color="secondary" className="mt-1">
              Administra las empresas temporales o medios de reclutamiento del portal.
            </Text>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-border)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Formulario de Adición */}
          <form onSubmit={handleCrear} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Nueva Empresa Temporal"
                placeholder="Ej: SUMMAR, MULTIEMPLEOS, etc."
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                disabled={guardando}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando || !nuevoNombre.trim()}
              icon={Plus}
              className="h-[42px] shrink-0"
            >
              Agregar
            </Button>
          </form>

          {/* Lista de Empresas */}
          <div className="space-y-3">
            <Title variant="h6" weight="bold" className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              Empresas Registradas
            </Title>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            ) : temporales.length === 0 ? (
              <div className="text-center py-8 bg-[var(--color-surface-secondary)] rounded-2xl border border-[var(--color-border)]">
                <Text color="secondary">No hay empresas registradas.</Text>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface-secondary)]">
                {temporales.map((temp) => {
                  const esEditando = editandoId === temp.id;
                  return (
                    <div key={temp.id} className="p-4 flex items-center justify-between gap-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                      {esEditando ? (
                        <div className="flex flex-1 items-center gap-3">
                          <Input
                            type="text"
                            value={editandoNombre}
                            onChange={(e) => setEditandoNombre(e.target.value)}
                            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                          <div className="flex items-center gap-2">
                            <Text as="span" className="text-xs text-[var(--color-text-secondary)]">Activo:</Text>
                            <Switch
                              checked={editandoActivo}
                              onChange={setEditandoActivo}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <Text className={`font-semibold truncate ${!temp.activo ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}>
                              {temp.nombre}
                            </Text>
                            {!temp.activo && (
                              <Text as="span" className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 font-bold">
                                Inactivo
                              </Text>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {esEditando ? (
                          <>
                            <Button
                              variant="custom"
                              onClick={() => handleGuardarEdicion(temp.id)}
                              disabled={guardando}
                              className="p-2 rounded-xl bg-emerald-100 text-emerald-800 hover:opacity-90 transition-opacity"
                              title="Guardar"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="custom"
                              onClick={handleCancelarEdicion}
                              disabled={guardando}
                              className="p-2 rounded-xl bg-slate-100 text-slate-800 hover:opacity-90 transition-opacity"
                              title="Cancelar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="custom"
                              onClick={() => handleIniciarEdicion(temp)}
                              disabled={guardando}
                              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="custom"
                              onClick={() => handleEliminar(temp.id)}
                              disabled={guardando}
                              className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-border)] flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfigTemporalesModal;
