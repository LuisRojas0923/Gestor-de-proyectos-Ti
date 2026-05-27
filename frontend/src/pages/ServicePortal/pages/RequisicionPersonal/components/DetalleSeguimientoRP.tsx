import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Calendar, UserPlus, Check, X, 
  ChevronRight, ChevronLeft, ShieldAlert, Award, FileText, BarChart2 
} from 'lucide-react';
import { Title, Text, Button, Badge } from '../../../../../components/atoms';
import { 
  getRequisicionTemporales, asignarRequisicionTemporales, actualizarFechaEnvioHV,
  getCandidatos, agregarCandidato, actualizarCandidato, getSeguimientoStats, getTemporales 
} from '../services/requisicionService';
import type { 
  RequisicionRP, RequisicionTemporal, CandidatoRequisicion, SeguimientoStats, EmpresaTemporal 
} from '../types/requisicion.types';
import KanbanCol from './KanbanCol';
import AnalisisTemporales from './AnalisisTemporales';

interface Props {
  requisicion: RequisicionRP;
  onBack: () => void;
  onStatusChanged?: () => void;
}

const CAUSALES_DISCARTE = [
  { value: 'N.C.EXP', label: 'Empresa: No cumple experiencia / perfil técnico' },
  { value: 'N.C. E.M', label: 'Empresa: No aprobó exámenes médicos' },
  { value: 'N.C. ENT', label: 'Empresa: No aprobó entrevista con líder' },
  { value: 'DESISTE_SALARIO', label: 'Candidato: Desistió por aspiración salarial' },
  { value: 'DESISTE_CONTRATO', label: 'Candidato: Desistió por tipo de contrato/horario' },
  { value: 'DESISTE_DISTANCIA', label: 'Candidato: Desistió por ubicación/transporte' },
  { value: 'DESISTE_PERSONAL', label: 'Candidato: Desistió por motivos personales' },
];

const DetalleSeguimientoRP: React.FC<Props> = ({ requisicion, onBack, onStatusChanged }) => {
  const [asignadas, setAsignadas] = useState<RequisicionTemporal[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoRequisicion[]>([]);
  const [stats, setStats] = useState<SeguimientoStats | null>(null);
  const [todasTemporales, setTodasTemporales] = useState<EmpresaTemporal[]>([]);
  
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

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [rt, cand, st, tt] = await Promise.all([
        getRequisicionTemporales(requisicion.id),
        getCandidatos(requisicion.id),
        getSeguimientoStats(requisicion.id),
        getTemporales()
      ]);
      setAsignadas(rt);
      setCandidatos(cand);
      setStats(st);
      setTodasTemporales(tt.filter(t => t.activo));
      setTemporalesSeleccionadas(rt.map(r => r.temporal_id));
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
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
              Cargo: {requisicion.cargo_nombre} — Vacantes solicitadas: <span className="font-bold text-[var(--color-primary)]">{requisicion.numero_personas_requeridas}</span>
            </Text>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setMostrarAsignar(true)}>Asignar Temporales</Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setMostrarAgregarCand(true)}
            disabled={asignadas.length === 0 || colContratado.length >= requisicion.numero_personas_requeridas}
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
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm">
            <Text variant="caption" color="secondary" className="font-medium">Total HVs Enviadas</Text>
            <div className="text-2xl font-bold mt-1 text-[var(--color-primary)]">{stats.total_hv}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
            <Text variant="caption" className="text-emerald-700 font-medium">Aplica (A)</Text>
            <div className="text-2xl font-bold mt-1 text-emerald-700">{stats.aplica}</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 shadow-sm">
            <Text variant="caption" className="text-rose-700 font-medium">No Aplica (N/A)</Text>
            <div className="text-2xl font-bold mt-1 text-rose-700">{stats.no_aplica}</div>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 shadow-sm">
            <Text variant="caption" className="text-indigo-700 font-medium">Por Evaluar</Text>
            <div className="text-2xl font-bold mt-1 text-indigo-700">{stats.por_evaluar}</div>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 shadow-sm">
            <Text variant="caption" className="text-violet-700 font-medium">Contratados</Text>
            <div className="text-2xl font-bold mt-1 text-violet-700">
              {stats.contratados} / {requisicion.numero_personas_requeridas}
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
                    <span>Envío RP: {a.fecha_envio ? new Date(a.fecha_envio).toLocaleDateString('es-CO') : '—'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)] mt-2">
                  {a.fecha_envio_hv ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="w-4 h-4" />
                      <span>Recibe HV desde: {new Date(a.fecha_envio_hv).toLocaleDateString('es-CO')}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleActivarFechaHV(a.temporal_id)}
                      className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                    >
                      Registrar Inicio Envío HV
                    </button>
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
          colorClass="border-indigo-200 bg-indigo-50/10 text-indigo-800"
          candidatos={colPorEvaluar}
          onMover={handleMoverEstado}
          ops={[{ label: 'Aplica', target: 'APLICA' }, { label: 'Descartar', target: 'NO_APLICA' }]}
        />
        {/* Columna: Aplica */}
        <KanbanCol
          title="Aplica (En Selección)"
          count={colAplica.length}
          colorClass="border-emerald-200 bg-emerald-50/10 text-emerald-800"
          candidatos={colAplica}
          onMover={handleMoverEstado}
          ops={[{ label: 'Contratar', target: 'CONTRATADO' }, { label: 'Descartar', target: 'NO_APLICA' }]}
        />
        {/* Columna: Contratados */}
        <KanbanCol
          title="Contratados"
          count={colContratado.length}
          colorClass="border-violet-200 bg-violet-50/10 text-violet-800"
          candidatos={colContratado}
          onMover={handleMoverEstado}
          ops={[{ label: 'Revertir a Selección', target: 'APLICA' }]}
        />
        {/* Columna: No Aplica */}
        <KanbanCol
          title="No Aplica (Descartados)"
          count={colNoAplica.length}
          colorClass="border-red-200 bg-red-50/10 text-red-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-6">
            <div>
              <Title variant="h5" weight="bold">Asignar Temporales</Title>
              <Text variant="caption" color="secondary" className="mt-1">
                Selecciona las empresas temporales o medios a las que se enviará esta requisición.
              </Text>
            </div>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {todasTemporales.map(t => {
                const checked = temporalesSeleccionadas.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-3 p-3 bg-[var(--color-surface-secondary)]/50 border border-[var(--color-border)] rounded-xl cursor-pointer hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setTemporalesSeleccionadas(temporalesSeleccionadas.filter(id => id !== t.id));
                        } else {
                          setTemporalesSeleccionadas([...temporalesSeleccionadas, t.id]);
                        }
                      }}
                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-[var(--color-border)]"
                    />
                    <Text className="text-sm font-semibold">{t.nombre}</Text>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMostrarAsignar(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleGuardarAsignacion}>Guardar Asignación</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Agregar Candidato */}
      {mostrarAgregarCand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleAgregarCandidato} className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-5">
            <div>
              <Title variant="h5" weight="bold">Agregar Candidato</Title>
              <Text variant="caption" color="secondary" className="mt-1">
                Ingresa los datos del nuevo candidato remitido para la vacante.
              </Text>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Nombre del Candidato</Text>
                <input
                  required
                  type="text"
                  placeholder="Ej: Carlos Gómez"
                  value={nuevoNombreCand}
                  onChange={e => setNuevoNombreCand(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-1">
                <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Temporal Remitente</Text>
                <select
                  required
                  value={nuevaTemporalCand || ''}
                  onChange={e => setNuevaTemporalCand(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="" disabled>Selecciona una temporal...</option>
                  {asignadas.map(a => (
                    <option key={a.temporal_id} value={a.temporal_id}>{a.nombre_temporal}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Observaciones iniciales</Text>
                <textarea
                  placeholder="Ej: Experiencia de 3 años, vive en Cali."
                  value={nuevasObsCand}
                  onChange={e => setNuevasObsCand(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setMostrarAgregarCand(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={cargandoCandidatos}>Registrar Candidato</Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Descartar Candidato (Selección de Causal) */}
      {candidatoDescartar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-5">
            <div>
              <Title variant="h5" weight="bold" className="text-red-600">Descartar Candidato</Title>
              <Text variant="caption" color="secondary" className="mt-1">
                Especifica los motivos por los cuales se descarta a: <strong>{candidatoDescartar.nombre_candidato}</strong>
              </Text>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Causal de Descarte (Obligatorio)</Text>
                <select
                  required
                  value={causalSeleccionada}
                  onChange={e => setCausalSeleccionada(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="" disabled>Selecciona la causal...</option>
                  {CAUSALES_DISCARTE.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Comentarios / Observaciones</Text>
                <textarea
                  placeholder="Detalles sobre el descarte..."
                  value={obsDescarte}
                  onChange={e => setObsDescarte(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCandidatoDescartar(null)}>Cancelar</Button>
              <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white" disabled={!causalSeleccionada || cargandoCandidatos} onClick={handleDescartarConfirmado}>
                Confirmar Descarte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleSeguimientoRP;
