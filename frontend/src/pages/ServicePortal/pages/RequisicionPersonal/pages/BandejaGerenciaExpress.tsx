import React, { useEffect, useState } from 'react';
import { Eye, CheckCircle, XCircle, Clock, Users, Briefcase, RefreshCw, ArrowLeft, Send, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, Title, Text } from '../../../../../components/atoms';
import { getBandejaGerente, aprobarGerente, rechazarGerente, devolverGerente } from '../services/requisicionService';
import type { RequisicionRP } from '../types/requisicion.types';
import RPStatusBadge from '../components/RPStatusBadge';

interface Props {
  onVolver: () => void;
}

interface ModalAccion {
  tipo: 'aprobar' | 'rechazar' | 'devolver';
  requisicion: RequisicionRP;
}

const BandejaGerenciaExpress: React.FC<Props> = ({ onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [seleccionada, setSeleccionada] = useState<RequisicionRP | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalAccion | null>(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = () => {
    setLoading(true);
    getBandejaGerente()
      .then((data) => {
        setRequisiciones(data);
        // Mantener seleccionada o tomar la primera si hay
        if (data.length > 0) {
          const yaSeleccionada = data.find(r => r.id === seleccionada?.id);
          setSeleccionada(yaSeleccionada || data[0]);
        } else {
          setSeleccionada(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleEjecutarAccion = async () => {
    if (!modal) return;
    if ((modal.tipo === 'rechazar' || modal.tipo === 'devolver') && !observacion.trim()) {
      alert('La observación es obligatoria para esta acción.');
      return;
    }
    setProcesando(true);
    try {
      if (modal.tipo === 'aprobar') await aprobarGerente(modal.requisicion.id, observacion);
      if (modal.tipo === 'rechazar') await rechazarGerente(modal.requisicion.id, observacion);
      if (modal.tipo === 'devolver') await devolverGerente(modal.requisicion.id, observacion);
      setModal(null);
      setObservacion('');
      cargar();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al procesar la acción.');
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
          <div>
            <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Firma Express — Requisiciones de Personal
            </Title>
            <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
              APROBACIÓN GENERAL / GERENCIA ADMINISTRATIVA Y FINANCIERA
            </Text>
          </div>
        </div>
        <Button variant="ghost" onClick={cargar} icon={RefreshCw} title="Actualizar" />
      </div>

      {requisiciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shadow-inner">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <Title variant="h5" weight="bold" align="center" className="text-slate-800 dark:text-slate-100">
              ¡Todo al día!
            </Title>
            <Text color="secondary" align="center" className="text-sm">
              No hay requisiciones pendientes de firma gerencial en este momento.
            </Text>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Panel Izquierdo: Lista Compacta */}
          <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            <Text className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              Pendientes de firma ({requisiciones.length})
            </Text>
            {requisiciones.map(req => {
              const esSeleccionada = req.id === seleccionada?.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSeleccionada(req)}
                  className={`p-4 rounded-2xl cursor-pointer border text-left transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm ${
                    esSeleccionada
                      ? 'bg-[var(--color-primary-light)]/10 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono font-black text-xs text-[var(--color-primary)]">{req.rp}</span>
                    <Text variant="caption" color="secondary" className="font-medium">
                      {req.fecha_decision_aprobador ? new Date(req.fecha_decision_aprobador).toLocaleDateString() : ''}
                    </Text>
                  </div>
                  <Title variant="subtitle1" weight="bold" className="mt-1 text-slate-800 dark:text-white line-clamp-1">
                    {req.cargo_nombre}
                  </Title>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-secondary)]">
                    <Users className="w-3.5 h-3.5" />
                    <span>Área: {req.area_nombre}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]/50">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                      Dir: {req.aprobador_nombre}
                    </span>
                    <Text variant="caption" className="font-bold text-[var(--color-primary)]">
                      ${req.salario_asignado?.toLocaleString() || '0'}
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel Derecho: Detalle y Acciones Rápidas */}
          <div className="lg:col-span-7 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-6">
            {seleccionada ? (
              <>
                <div className="flex justify-between items-start border-b border-[var(--color-border)] pb-4">
                  <div>
                    <span className="font-mono font-bold text-xs bg-[var(--color-primary-light)]/20 text-[var(--color-primary)] px-2.5 py-1 rounded-full">
                      {seleccionada.rp}
                    </span>
                    <Title variant="h5" weight="bold" className="mt-2 text-slate-800 dark:text-white">
                      {seleccionada.cargo_nombre}
                    </Title>
                    <Text variant="caption" color="secondary" className="mt-1 block">
                      Solicitante: <strong>{seleccionada.nombre_solicitante}</strong> ({seleccionada.correo_solicitante})
                    </Text>
                  </div>
                  <RPStatusBadge estado={seleccionada.estado} size="md" />
                </div>

                {/* Resumen de Condiciones */}
                <div className="grid grid-cols-2 gap-4 bg-[var(--color-surface-secondary)] p-4 rounded-2xl text-sm">
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs block">Ciudad / Sede</span>
                    <strong className="text-slate-800 dark:text-white">{seleccionada.ciudad_nombre || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs block">Centro de Costo</span>
                    <strong className="text-slate-800 dark:text-white">{seleccionada.centro_costo || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs block">OT / Proyecto</span>
                    <strong className="text-slate-800 dark:text-white">{seleccionada.ot || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs block">Personas Requeridas</span>
                    <strong className="text-slate-800 dark:text-white">{seleccionada.numero_personas_requeridas} vacante(s)</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs block">Salario Asignado</span>
                    <strong className="text-[var(--color-primary)] font-bold">${seleccionada.salario_asignado?.toLocaleString() || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs block">Tipo de Contrato</span>
                    <strong className="text-slate-800 dark:text-white">{seleccionada.tipo_contratacion || '—'}</strong>
                  </div>
                </div>

                {/* Causal y Perfil */}
                <div className="space-y-4 text-sm">
                  <div>
                    <Text className="font-bold text-slate-700 dark:text-neutral-300">Justificación del Cargo (Causal):</Text>
                    <div className="mt-1 bg-slate-50 dark:bg-neutral-800 p-3 rounded-xl border border-slate-100 dark:border-neutral-700 text-[var(--color-text-secondary)]">
                      {seleccionada.causal_requisicion} {seleccionada.otra_causal ? `— ${seleccionada.otra_causal}` : ''}
                    </div>
                  </div>

                  <div>
                    <Text className="font-bold text-slate-700 dark:text-neutral-300">Área y Cargo:</Text>
                    <div className="mt-1 bg-slate-50 dark:bg-neutral-800 p-3 rounded-xl border border-slate-100 dark:border-neutral-700 text-[var(--color-text-secondary)]">
                      <strong>Área:</strong> {seleccionada.area_nombre || '—'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Cargo:</strong> {seleccionada.cargo_nombre || '—'}
                    </div>
                  </div>
                </div>

                {/* Firma del Director de Área */}
                <div className="bg-blue-50/50 dark:bg-neutral-800/50 border border-blue-100 dark:border-neutral-700 p-4 rounded-2xl text-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-blue-900 dark:text-blue-200">Aprobación del Director de Área</span>
                  </div>
                  <Text className="text-[var(--color-text-secondary)] leading-tight">
                    Aprobado por: <strong>{seleccionada.aprobador_nombre}</strong> ({seleccionada.aprobador_email})
                  </Text>
                  {seleccionada.observacion_aprobador && (
                    <div className="mt-2 text-xs italic text-slate-600 dark:text-neutral-400 bg-white dark:bg-neutral-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800/80">
                      "{seleccionada.observacion_aprobador}"
                    </div>
                  )}
                </div>

                {/* Botones de Acción Rápida */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--color-border)]">
                  <Button
                    variant="custom"
                    className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 font-bold shadow-md active:scale-[0.98]"
                    onClick={() => setModal({ tipo: 'aprobar', requisicion: seleccionada })}
                    icon={CheckCircle}
                  >
                    Firmar y Autorizar
                  </Button>

                  <Button
                    variant="custom"
                    className="sm:w-32 bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 font-bold active:scale-[0.98]"
                    onClick={() => setModal({ tipo: 'devolver', requisicion: seleccionada })}
                    icon={RotateCcw}
                  >
                    Devolver
                  </Button>

                  <Button
                    variant="danger"
                    className="sm:w-32 font-bold active:scale-[0.98]"
                    onClick={() => setModal({ tipo: 'rechazar', requisicion: seleccionada })}
                    icon={XCircle}
                  >
                    Rechazar
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-[var(--color-text-secondary)]">
                Seleccione una requisición de la lista para ver su detalle.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Decisión */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] w-full max-w-lg rounded-3xl p-6 shadow-xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-lg font-bold border-b border-[var(--color-border)] pb-3">
              {modal.tipo === 'aprobar' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {modal.tipo === 'devolver' && <AlertTriangle className="w-5 h-5 text-orange-600" />}
              {modal.tipo === 'rechazar' && <XCircle className="w-5 h-5 text-red-600" />}
              <span>
                {modal.tipo === 'aprobar' && 'Confirmar Firma y Aprobación'}
                {modal.tipo === 'devolver' && 'Devolver para Ajustes'}
                {modal.tipo === 'rechazar' && 'Rechazar Requisición'}
              </span>
            </div>

            <Text color="secondary" className="text-sm">
              ¿Está seguro de que desea <strong>{modal.tipo}</strong> la requisición <strong>{modal.requisicion.rp}</strong> para el cargo de <strong>{modal.requisicion.cargo_nombre}</strong>?
            </Text>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block">
                {modal.tipo === 'aprobar' ? 'Observaciones de firma (opcional):' : 'Observación obligatoria del motivo:'}
              </label>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder={modal.tipo === 'aprobar' ? 'Ej: Todo correcto, autorizado.' : 'Ej: Falta definir rango salarial exacto.'}
                rows={3}
                className="w-full text-sm border border-[var(--color-border)] rounded-2xl p-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder-slate-400"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <Button
                variant="ghost"
                onClick={() => { setModal(null); setObservacion(''); }}
                disabled={procesando}
              >
                Cancelar
              </Button>
              <Button
                variant={modal.tipo === 'aprobar' ? 'custom' : modal.tipo === 'rechazar' ? 'danger' : 'custom'}
                className={modal.tipo === 'aprobar' ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500' : modal.tipo === 'devolver' ? 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500' : ''}
                disabled={procesando || ((modal.tipo === 'devolver' || modal.tipo === 'rechazar') && !observacion.trim())}
                onClick={handleEjecutarAccion}
                loading={procesando}
                icon={Send}
                iconPosition="right"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BandejaGerenciaExpress;
