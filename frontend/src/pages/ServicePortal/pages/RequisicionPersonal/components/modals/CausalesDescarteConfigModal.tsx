import React, { useEffect, useState } from 'react';
import { X, Plus, Edit2, Save, XCircle } from 'lucide-react';
import { Button, Input, Text, Title, Badge } from '../../../../../../components/atoms';
import {
  getCausalesDescarte,
  crearCausalDescarte,
  actualizarCausalDescarte,
  toggleCausalDescarte
} from '../../services/requisicionService';
import type { CausalDescarteRP } from '../../types/requisicion.types';

interface Props {
  onClose: () => void;
}

const CausalesDescarteConfigModal: React.FC<Props> = ({ onClose }) => {
  const [causales, setCausales] = useState<CausalDescarteRP[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [nuevaCausal, setNuevaCausal] = useState('');
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editTexto, setEditTexto] = useState('');

  useEffect(() => {
    cargarCausales();
  }, []);

  const cargarCausales = async () => {
    try {
      setCargando(true);
      const data = await getCausalesDescarte(false);
      setCausales(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar causales.');
    } finally {
      setCargando(false);
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCausal.trim()) return;
    try {
      setCreando(true);
      setError('');
      await crearCausalDescarte(nuevaCausal);
      setNuevaCausal('');
      await cargarCausales();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear causal.');
    } finally {
      setCreando(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      setError('');
      await toggleCausalDescarte(id);
      await cargarCausales();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cambiar estado.');
    }
  };

  const iniciarEdicion = (c: CausalDescarteRP) => {
    setEditandoId(c.id);
    setEditTexto(c.causal);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditTexto('');
  };

  const guardarEdicion = async (c: CausalDescarteRP) => {
    if (!editTexto.trim() || editTexto === c.causal) {
      cancelarEdicion();
      return;
    }
    try {
      setError('');
      await actualizarCausalDescarte(c.id, editTexto, c.activo);
      setEditandoId(null);
      await cargarCausales();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar causal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-2xl rounded-3xl border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div>
            <Title variant="h5" weight="bold">Configurar Causales de Descarte</Title>
            <Text variant="caption" color="secondary" className="mt-1">
              Administra las opciones disponibles al descartar un candidato.
            </Text>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-border)] transition-colors">
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[var(--color-surface-subtle)]">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleCrear} className="flex gap-2">
            <Input
              placeholder="Nueva causal de descarte..."
              value={nuevaCausal}
              onChange={e => setNuevaCausal(e.target.value)}
              className="flex-1 rounded-xl"
              disabled={creando}
            />
            <Button type="submit" variant="primary" disabled={creando || !nuevaCausal.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </form>

          {cargando ? (
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <Text variant="body2" color="secondary">Cargando...</Text>
            </div>
          ) : causales.length === 0 ? (
            <div className="py-10 text-center">
              <Text variant="body2" color="secondary">No hay causales registradas.</Text>
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                    <th className="p-4 font-medium text-[var(--color-text-secondary)]">Causal</th>
                    <th className="p-4 font-medium text-[var(--color-text-secondary)] w-24">Estado</th>
                    <th className="p-4 font-medium text-[var(--color-text-secondary)] w-32 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {causales.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--color-surface-subtle)] transition-colors">
                      <td className="p-4">
                        {editandoId === c.id ? (
                          <Input
                            autoFocus
                            value={editTexto}
                            onChange={(e) => setEditTexto(e.target.value)}
                            className="w-full text-sm rounded-lg"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') guardarEdicion(c);
                              if (e.key === 'Escape') cancelarEdicion();
                            }}
                          />
                        ) : (
                          <Text variant="body2" className={!c.activo ? 'line-through text-gray-400' : ''}>
                            {c.causal}
                          </Text>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={c.activo ? 'success' : 'neutral'}
                          className="cursor-pointer select-none"
                          onClick={() => handleToggle(c.id)}
                        >
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        {editandoId === c.id ? (
                          <>
                            <button onClick={() => guardarEdicion(c)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Guardar">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelarEdicion} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cancelar">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => iniciarEdicion(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CausalesDescarteConfigModal;
