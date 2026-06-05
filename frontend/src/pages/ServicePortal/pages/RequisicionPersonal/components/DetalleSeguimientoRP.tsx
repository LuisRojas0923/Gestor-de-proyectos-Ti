import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Calendar, UserPlus, Check, X, 
  ChevronRight, ChevronLeft, ShieldAlert, Award, FileText, BarChart2 
} from 'lucide-react';
import { Badge, Button, Text, Title } from '../../../../../components/atoms';
import { 
  getRequisicionTemporales, asignarRequisicionTemporales, actualizarFechaEnvioHV,
  getCandidatos, agregarCandidato, actualizarCandidato, getSeguimientoStats, getTemporales,
  cancelarRequisicionGH, getCausalesDescarte, marcarVistaGH, devolverModificacionSalarial
} from '../services/requisicionService';
import type { 
  RequisicionRP, RequisicionTemporal, CandidatoRequisicion, SeguimientoStats, EmpresaTemporal, CausalDescarteRP
} from '../types/requisicion.types';
import KanbanCol from './KanbanCol';
import AnalisisTemporales from './AnalisisTemporales';
import AsignarTemporalesModal from './modals/AsignarTemporalesModal';
import AgregarCandidatoModal from './modals/AgregarCandidatoModal';
import DescartarCandidatoModal from './modals/DescartarCandidatoModal';
import CancelarRPModal from './modals/CancelarRPModal';
import DevolverModificacionModal from './modals/DevolverModificacionModal';

interface Props {
  requisicion: RequisicionRP;
  onBack: () => void;
  onStatusChanged?: () => void;
}

// Removida CAUSALES_DISCARTE estática

const DetalleSeguimientoRP: React.FC<Props> = ({ requisicion, onBack, onStatusChanged }) => {
  const [asignadas, setAsignadas] = useState<RequisicionTemporal[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoRequisicion[]>([]);
  const [stats, setStats] = useState<SeguimientoStats | null>(null);
  const [todasTemporales, setTodasTemporales] = useState<EmpresaTemporal[]>([]);
  const [causalesDescarte, setCausalesDescarte] = useState<{ value: string; label: string }[]>([]);
  
  const [cargando, setCargando] = useState(true);
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false);
  
  // Modals & Forms states
  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const [temporalesSeleccionadas, setTemporalesSeleccionadas] = useState<number[]>([]);
  
  const [mostrarAgregarCand, setMostrarAgregarCand] = useState(false);
  const [nuevoNombreCand, setNuevoNombreCand] = useState('');
  const [nuevaTemporalCand, setNuevaTemporalCand] = useState<number>(0);
  const [nuevasObsCand, setNuevasObsCand] = useState('');
  
  const [candidatoDescartar, setCandidatoDescartar] = useState<CandidatoRequisicion | null>(null);
  const [causalSeleccionada, setCausalSeleccionada] = useState('');
  const [obsDescarte, setObsDescarte] = useState('');

  // Cancelar RP
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Devolver por Modificacion Salarial
  const [mostrarDevolverModificacion, setMostrarDevolverModificacion] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);


  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [rt, cand, st, tt, causales] = await Promise.all([
        getRequisicionTemporales(requisicion.id),
        getCandidatos(requisicion.id),
        getSeguimientoStats(requisicion.id),
        getTemporales(),
        getCausalesDescarte(true)
      ]);
      setAsignadas(rt);
      setCandidatos(cand);
      setStats(st);
      setTodasTemporales(tt.filter(t => t.activo));
      setCausalesDescarte(causales.map(c => ({ value: c.causal, label: c.causal })));
      setTemporalesSeleccionadas(rt.map(r => r.temporal_id));
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    marcarVistaGH(requisicion.id).catch(() => {});
  }, [requisicion.id]);

  useEffect(() => {
    if (mostrarAgregarCand && asignadas.length > 0) {
      setNuevaTemporalCand(asignadas[0].temporal_id);
    } else if (!mostrarAgregarCand) {
      setNuevaTemporalCand(0);
    }
  }, [mostrarAgregarCand, asignadas]);

  const handleGuardarAsignacion = async () => {
    setCargando(true);
    try {
      await asignarRequisicionTemporales(requisicion.id, temporalesSeleccionadas);
      setMostrarAsignar(false);
      await cargarDatos();
      if (onStatusChanged) onStatusChanged();
    } catch (e) {
      alert('Error al asignar temporales');
    } finally {
      setCargando(false);
    }
  };

  const handleActivarFechaHV = async (temporalId: number) => {
    const confirm = window.confirm('¿Registrar que la temporal inició el envío de hojas de vida hoy?');
    if (!confirm) return;
    try {
      await actualizarFechaEnvioHV(requisicion.id, temporalId, new Date().toISOString());
      await cargarDatos();
    } catch (e) {
      alert('Error al registrar fecha');
    }
  };

  const handleAgregarCandidato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreCand.trim()) {
      alert("Por favor, ingresa el nombre del candidato.");
      return;
    }
    if (!nuevaTemporalCand) {
      alert("Por favor, selecciona una empresa temporal.");
      return;
    }
    setCargandoCandidatos(true);
    try {
      await agregarCandidato(requisicion.id, nuevaTemporalCand, nuevoNombreCand, nuevasObsCand);
      setMostrarAgregarCand(false);
      setNuevoNombreCand('');
      setNuevaTemporalCand(0);
      setNuevasObsCand('');
      await cargarDatos();
    } catch (e) {
      alert('Error al registrar candidato');
    } finally {
      setCargandoCandidatos(false);
    }
  };

  const handleMoverEstado = async (cand: CandidatoRequisicion, nuevoEstado: string) => {
    if (nuevoEstado === 'CONTRATADO') {
      const yaContratados = candidatos.filter(c => c.estado === 'CONTRATADO').length;
      if (yaContratados >= requisicion.numero_personas_requeridas) {
        alert(
          `No se puede contratar a este candidato porque ya se completaron las ${requisicion.numero_personas_requeridas} vacantes solicitadas.`
        );
        return;
      }
    }

    if (nuevoEstado === 'NO_APLICA') {
      setCausalSeleccionada('');
      setObsDescarte('');
      setCandidatoDescartar(cand);
      return;
    }
    
    setCargandoCandidatos(true);
    try {
      await actualizarCandidato(cand.id, { estado: nuevoEstado, causal_descarte: '' });
      await cargarDatos();
      if (onStatusChanged) onStatusChanged();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al actualizar estado del candidato');
    } finally {
      setCargandoCandidatos(false);
    }
  };

  const handleDescartarConfirmado = async () => {
    if (!candidatoDescartar || !causalSeleccionada) return;
    setCargandoCandidatos(true);
    try {
      await actualizarCandidato(candidatoDescartar.id, {
        estado: 'NO_APLICA',
        causal_descarte: causalSeleccionada,
        observaciones: obsDescarte
      });
      setCandidatoDescartar(null);
      await cargarDatos();
      if (onStatusChanged) onStatusChanged();
    } catch (e) {
      alert('Error al descartar candidato');
    } finally {
      setCargandoCandidatos(false);
    }
  };

  const handleCancelarRP = async () => {
    if (!motivoCancelacion.trim()) {
      alert('Debes ingresar el motivo de cancelación.');
      return;
    }
    setCancelando(true);
    try {
      await cancelarRequisicionGH(requisicion.id, motivoCancelacion.trim());
      setMostrarCancelar(false);
      setMotivoCancelacion('');
      await cargarDatos();
      if (onStatusChanged) onStatusChanged();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al cancelar la requisición.');
    } finally {
      setCancelando(false);
    }
  };

  const handleDevolverModificacion = async () => {
    if (!motivoDevolucion.trim()) {
      alert('Debes ingresar el motivo de la devolución.');
      return;
    }
    setDevolviendo(true);
    try {
      await devolverModificacionSalarial(requisicion.id, motivoDevolucion.trim());
      setMostrarDevolverModificacion(false);
      setMotivoDevolucion('');
      await cargarDatos();
      if (onStatusChanged) onStatusChanged();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al devolver la requisición.');
    } finally {
      setDevolviendo(false);
    }
  };


  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Filtrar candidatos por columna de Kanban
  const colPorEvaluar = candidatos.filter(c => c.estado === 'POR_EVALUAR');
  const colAplica = candidatos.filter(c => c.estado === 'APLICA');
  const colContratado = candidatos.filter(c => c.estado === 'CONTRATADO');
  const colNoAplica = candidatos.filter(c => c.estado === 'NO_APLICA');

  return (
    <div className="space-y-6">
      {/* Botón Volver & Info Principal */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0 mr-2">Volver</Button>
          <div>
            <div className="flex items-center gap-2">
              <Title variant="h4" weight="bold" className="font-mono">{requisicion.rp}</Title>
              <Badge variant="emerald">{requisicion.area_nombre}</Badge>
            </div>
            <Text color="secondary" className="mt-0.5 font-medium">
              Cargo: {requisicion.cargo_nombre} — Vacantes solicitadas: <Text as="span" className="font-bold text-[var(--color-primary)]">{requisicion.numero_personas_requeridas}</Text>
            </Text>
          </div>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 gap-1">
          {/* Cancelar RP — solo si no está en estado final */}
          {!['CERRADA', 'CANCELADA', 'DEVUELTA_MODIFICACION_SALARIAL'].includes(requisicion.estado) && (
            <>
              <Button
                variant="ghost"
                onClick={() => setMostrarDevolverModificacion(true)}
                className="text-amber-600 hover:text-amber-700 hover:bg-white dark:hover:bg-slate-700 rounded-xl px-4 py-2 font-semibold text-sm transition-all"
              >
                Modificar (Devolver)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setMostrarCancelar(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-white dark:hover:bg-slate-700 rounded-xl px-4 py-2 font-semibold text-sm transition-all"
              >
                Cancelar RP
              </Button>
            </>
          )}
          <Button 
             variant="ghost" 
             onClick={() => setMostrarAsignar(true)}
             className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl px-4 py-2 font-semibold text-sm transition-all"
          >
             Asignar Temporales
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setMostrarAgregarCand(true)}
            disabled={asignadas.length === 0 || colContratado.length >= requisicion.numero_personas_requeridas}
            className="rounded-xl px-4 py-2 font-bold text-sm shadow-md shadow-blue-900/20"
            title={
              colContratado.length >= requisicion.numero_personas_requeridas
                ? "Todas las vacantes ya han sido contratadas."
                : asignadas.length === 0
                ? "Debe asignar al menos una temporal antes de agregar candidatos."
                : undefined
            }
          >
            Agregar Candidato
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Seguimiento */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total HVs Enviadas */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <Text variant="caption" color="secondary" className="block uppercase tracking-wider font-bold">Total HVs Enviadas</Text>
              <div className="text-xl font-bold leading-none mt-1">{stats.total_hv}</div>
            </div>
          </div>
          {/* Aplica (A) */}
          <div className="rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-transparent shadow-sm flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <Text variant="caption" className="block truncate font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Aplica (A)</Text>
              <div className="text-xl font-bold leading-none mt-1 text-emerald-700 dark:text-emerald-400">{stats.aplica}</div>
            </div>
          </div>
          {/* No Aplica (N/A) */}
          <div className="rounded-2xl p-4 bg-rose-50 dark:bg-rose-950/20 border border-transparent shadow-sm flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <X className="w-5 h-5 text-rose-700 dark:text-rose-400" />
            </div>
            <div className="min-w-0">
              <Text variant="caption" className="block truncate font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">No Aplica (N/A)</Text>
              <div className="text-xl font-bold leading-none mt-1 text-rose-700 dark:text-rose-400">{stats.no_aplica}</div>
            </div>
          </div>
          {/* Por Evaluar */}
          <div className="rounded-2xl p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-transparent shadow-sm flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <Text variant="caption" className="block truncate font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Por Evaluar</Text>
              <div className="text-xl font-bold leading-none mt-1 text-indigo-700 dark:text-indigo-400">{stats.por_evaluar}</div>
            </div>
          </div>
          {/* Contratados */}
          <div className="rounded-2xl p-4 bg-violet-50 dark:bg-violet-950/20 border border-transparent shadow-sm flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-violet-700 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <Text variant="caption" className="block truncate font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Contratados</Text>
              <div className="text-xl font-bold leading-none mt-1 text-violet-700 dark:text-violet-400">
                {stats.contratados} <Text as="span" className="text-sm opacity-70">/ {requisicion.numero_personas_requeridas}</Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporales Asignadas */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <Title variant="h6" weight="bold" className="text-sm uppercase tracking-wider text-[var(--color-text-secondary)]">
          Reclutamiento Asignado (Temporales)
        </Title>
        {asignadas.length === 0 ? (
          <div className="text-center py-4 bg-[var(--color-surface-secondary)] rounded-xl border border-dashed border-[var(--color-border)]">
            <Text color="secondary">No se han asignado temporales para esta requisición. Haz clic en "Asignar Temporales" arriba.</Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {asignadas.map(a => (
              <div key={a.temporal_id} className="border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                <div>
                  <Text className="font-bold text-sm block truncate text-[var(--color-text-primary)]">{a.nombre_temporal}</Text>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-secondary)]">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <Text as="span">Envío RP: {a.fecha_envio ? new Date(a.fecha_envio).toLocaleDateString('es-CO') : '—'}</Text>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)] mt-2">
                  {a.fecha_envio_hv ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="w-4 h-4" />
                      <Text as="span">Recibe HV desde: {new Date(a.fecha_envio_hv).toLocaleDateString('es-CO')}</Text>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleActivarFechaHV(a.temporal_id)}
                      className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                    >
                      Registrar Inicio Envío HV
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban / Pipeline de Candidatos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Columna: Por Evaluar */}
        <KanbanCol
          title="Por Evaluar (Recibidos)"
          count={colPorEvaluar.length}
          theme="indigo"
          candidatos={colPorEvaluar}
          onMover={handleMoverEstado}
          ops={[{ label: 'Aplica', target: 'APLICA' }, { label: 'Descartar', target: 'NO_APLICA' }]}
        />
        {/* Columna: Aplica */}
        <KanbanCol
          title="Aplica (En Selección)"
          count={colAplica.length}
          theme="emerald"
          candidatos={colAplica}
          onMover={handleMoverEstado}
          ops={[{ label: 'Contratar', target: 'CONTRATADO' }, { label: 'Descartar', target: 'NO_APLICA' }]}
        />
        {/* Columna: Contratados */}
        <KanbanCol
          title="Contratados"
          count={colContratado.length}
          theme="violet"
          candidatos={colContratado}
          onMover={handleMoverEstado}
          ops={[{ label: 'Revertir a Selección', target: 'APLICA' }]}
        />
        {/* Columna: No Aplica */}
        <KanbanCol
          title="No Aplica (Descartados)"
          count={colNoAplica.length}
          theme="red"
          candidatos={colNoAplica}
          onMover={handleMoverEstado}
          ops={[{ label: 'Evaluar Nuevamente', target: 'POR_EVALUAR' }]}
        />
      </div>

      {/* Análisis Completo por Temporales */}
      <AnalisisTemporales
        asignadas={asignadas}
        candidatos={candidatos}
        vacantesRequeridas={requisicion.numero_personas_requeridas}
      />

      {/* MODAL: Asignar Temporales */}
      {mostrarAsignar && (
        <AsignarTemporalesModal
          todasTemporales={todasTemporales}
          temporalesSeleccionadas={temporalesSeleccionadas}
          setTemporalesSeleccionadas={setTemporalesSeleccionadas}
          onClose={() => setMostrarAsignar(false)}
          onGuardar={handleGuardarAsignacion}
        />
      )}

      {/* MODAL: Agregar Candidato */}
      {mostrarAgregarCand && (
        <AgregarCandidatoModal
          asignadas={asignadas}
          nuevoNombreCand={nuevoNombreCand}
          setNuevoNombreCand={setNuevoNombreCand}
          nuevaTemporalCand={nuevaTemporalCand}
          setNuevaTemporalCand={setNuevaTemporalCand}
          nuevasObsCand={nuevasObsCand}
          setNuevasObsCand={setNuevasObsCand}
          cargandoCandidatos={cargandoCandidatos}
          onClose={() => setMostrarAgregarCand(false)}
          onSubmit={handleAgregarCandidato}
        />
      )}

      {/* MODAL: Descartar Candidato (Selección de Causal) */}
      {candidatoDescartar && (
        <DescartarCandidatoModal
          candidatoDescartar={candidatoDescartar}
          causales={causalesDescarte}
          causalSeleccionada={causalSeleccionada}
          setCausalSeleccionada={setCausalSeleccionada}
          obsDescarte={obsDescarte}
          setObsDescarte={setObsDescarte}
          cargandoCandidatos={cargandoCandidatos}
          onClose={() => setCandidatoDescartar(null)}
          onConfirm={handleDescartarConfirmado}
        />
      )}

      {/* MODAL: Cancelar RP */}
      {mostrarCancelar && (
        <CancelarRPModal
          requisicion={requisicion}
          motivoCancelacion={motivoCancelacion}
          setMotivoCancelacion={setMotivoCancelacion}
          cancelando={cancelando}
          onClose={() => { setMostrarCancelar(false); setMotivoCancelacion(''); }}
          onConfirm={handleCancelarRP}
        />
      )}

      {/* MODAL: Devolver RP por Modificacion Salarial */}
      {mostrarDevolverModificacion && (
        <DevolverModificacionModal
          requisicion={requisicion}
          motivo={motivoDevolucion}
          setMotivo={setMotivoDevolucion}
          devolviendo={devolviendo}
          onClose={() => { setMostrarDevolverModificacion(false); setMotivoDevolucion(''); }}
          onConfirm={handleDevolverModificacion}
        />
      )}
    </div>
  );
};

export default DetalleSeguimientoRP;
