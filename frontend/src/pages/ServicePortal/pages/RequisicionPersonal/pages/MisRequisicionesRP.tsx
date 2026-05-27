import React, { useEffect, useState } from 'react';
import { Plus, Eye, Edit, XCircle, Send, ArrowLeft } from 'lucide-react';
import { Button, Title, Text } from '../../../../../components/atoms';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP } from '../types/requisicion.types';
import { getMisRequisiciones, cancelarRequisicion, enviarAAprobacion } from '../services/requisicionService';

interface Props {
  correoSolicitante: string;
  nombreSolicitante: string;
  onNueva: () => void;
  onVer: (id: number) => void;
  onEditar: (id: number) => void;
  onVolver: () => void;
}

const MisRequisicionesRP: React.FC<Props> = ({ correoSolicitante, nombreSolicitante, onNueva, onVer, onEditar, onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    getMisRequisiciones(correoSolicitante)
      .then(setRequisiciones)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [correoSolicitante]);

  const handleCancelar = async (id: number) => {
    if (!window.confirm('¿Está seguro de cancelar esta requisición?')) return;
    await cancelarRequisicion(id, correoSolicitante, nombreSolicitante);
    cargar();
  };

  const handleReenviar = async (id: number) => {
    await enviarAAprobacion(id, correoSolicitante, nombreSolicitante);
    cargar();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold p-0">
        Volver
      </Button>
      <div className="flex items-center justify-between">
        <Title variant="h5" weight="bold">Mis Requisiciones de Personal</Title>
        <Button variant="primary" icon={Plus} onClick={onNueva}>Nueva Requisición</Button>
      </div>

      {requisiciones.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <Text color="secondary" className="mb-4">No tiene requisiciones registradas aún.</Text>
          <Button variant="primary" icon={Plus} onClick={onNueva}>Crear primera requisición</Button>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
              <tr>
                {['RP', 'Fecha', 'Área', 'Cargo', 'Estado', 'Aprobador', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {requisiciones.map(req => (
                <tr key={req.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[var(--color-primary)]">
                    {req.rp || <span className="text-[var(--color-text-tertiary)] italic">Sin RP</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {req.fecha_radicacion ? new Date(req.fecha_radicacion).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-4 py-3">{req.area_nombre || '—'}</td>
                  <td className="px-4 py-3">{req.cargo_nombre || '—'}</td>
                  <td className="px-4 py-3"><RPStatusBadge estado={req.estado} size="sm" /></td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{req.aprobador_nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onVer(req.id)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {(req.estado === 'BORRADOR' || req.estado === 'DEVUELTA_AJUSTE') && (
                        <button onClick={() => onEditar(req.id)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-amber-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {req.estado === 'DEVUELTA_AJUSTE' && (
                        <button onClick={() => handleReenviar(req.id)} title="Reenviar a aprobación"
                          className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-emerald-600 transition-colors">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {req.estado === 'BORRADOR' && (
                        <button onClick={() => handleCancelar(req.id)} title="Cancelar"
                          className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-red-600 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MisRequisicionesRP;
