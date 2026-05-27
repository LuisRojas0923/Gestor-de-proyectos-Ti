import React, { useEffect, useState } from 'react';
import { Eye, CheckCircle, XCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button, Title, Text } from '../../../../../components/atoms';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP } from '../types/requisicion.types';
import { getBandejaAprobador, aprobarRequisicion, rechazarRequisicion, devolverRequisicion } from '../services/requisicionService';

interface Props {
  correoAprobador: string;
  onVer: (id: number) => void;
  onVolver: () => void;
}

interface ModalAccion {
  tipo: 'aprobar' | 'rechazar' | 'devolver';
  requisicionId: number;
  rp: string;
}

const BandejaAprobadorRP: React.FC<Props> = ({ correoAprobador, onVer, onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalAccion | null>(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = () => {
    setLoading(true);
    getBandejaAprobador(correoAprobador)
      .then(setRequisiciones)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [correoAprobador]);

  const handleAccion = async () => {
    if (!modal) return;
    if ((modal.tipo === 'rechazar' || modal.tipo === 'devolver') && !observacion.trim()) {
      alert('La observación es obligatoria para esta acción.');
      return;
    }
    setProcesando(true);
    try {
      if (modal.tipo === 'aprobar') await aprobarRequisicion(modal.requisicionId, observacion);
      if (modal.tipo === 'rechazar') await rechazarRequisicion(modal.requisicionId, observacion);
      if (modal.tipo === 'devolver') await devolverRequisicion(modal.requisicionId, observacion);
      setModal(null);
      setObservacion('');
      cargar();
    } finally {
      setProcesando(false);
    }
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
      <Title variant="h5" weight="bold">Aprobaciones Pendientes</Title>

      {requisiciones.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <Text color="secondary">No tiene requisiciones pendientes de aprobación.</Text>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
              <tr>
                {['RP', 'Solicitante', 'Área', 'Cargo', 'N° Pers.', 'Ingreso', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {requisiciones.map(req => (
                <tr key={req.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[var(--color-primary)]">{req.rp}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{req.nombre_solicitante}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{req.correo_solicitante}</div>
                  </td>
                  <td className="px-4 py-3">{req.area_nombre || '—'}</td>
                  <td className="px-4 py-3">{req.cargo_nombre || '—'}</td>
                  <td className="px-4 py-3 text-center">{req.numero_personas_requeridas}</td>
                  <td className="px-4 py-3">{req.fecha_probable_ingreso || '—'}</td>
                  <td className="px-4 py-3"><RPStatusBadge estado={req.estado} size="sm" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onVer(req.id)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setModal({ tipo: 'aprobar', requisicionId: req.id, rp: req.rp! }); setObservacion(''); }}
                        title="Aprobar"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-[var(--color-text-secondary)] hover:text-emerald-600 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setModal({ tipo: 'devolver', requisicionId: req.id, rp: req.rp! }); setObservacion(''); }}
                        title="Devolver para ajuste"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-[var(--color-text-secondary)] hover:text-amber-600 transition-colors">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setModal({ tipo: 'rechazar', requisicionId: req.id, rp: req.rp! }); setObservacion(''); }}
                        title="Rechazar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--color-text-secondary)] hover:text-red-600 transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación de acción */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-3xl shadow-2xl border border-[var(--color-border)] p-8 max-w-md w-full mx-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4
              ${modal.tipo === 'aprobar' ? 'bg-emerald-100' : modal.tipo === 'rechazar' ? 'bg-red-100' : 'bg-amber-100'}`}>
              {modal.tipo === 'aprobar' ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                : modal.tipo === 'rechazar' ? <XCircle className="w-6 h-6 text-red-600" />
                : <RotateCcw className="w-6 h-6 text-amber-600" />}
            </div>
            <Title variant="h5" weight="bold" className="mb-1">
              {modal.tipo === 'aprobar' ? 'Aprobar requisición'
                : modal.tipo === 'rechazar' ? 'Rechazar requisición'
                : 'Devolver para ajuste'}
            </Title>
            <Text color="secondary" className="mb-4">Requisición: <strong>{modal.rp}</strong></Text>

            <textarea
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px]"
              placeholder={modal.tipo === 'aprobar' ? 'Observación (opcional)' : 'Observación obligatoria...'}
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-semibold hover:bg-[var(--color-surface-secondary)] transition-colors">
                Cancelar
              </button>
              <button onClick={handleAccion} disabled={procesando}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors
                  ${modal.tipo === 'aprobar' ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modal.tipo === 'rechazar' ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50`}>
                {procesando ? 'Procesando...' : modal.tipo === 'aprobar' ? 'Confirmar aprobación'
                  : modal.tipo === 'rechazar' ? 'Confirmar rechazo' : 'Confirmar devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BandejaAprobadorRP;
