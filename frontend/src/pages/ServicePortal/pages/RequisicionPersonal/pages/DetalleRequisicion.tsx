// Detalle completo de una Requisición de Personal
import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { Button, Title, Text, Input } from '../../../../../components/atoms';
import RPStatusBadge from '../components/RPStatusBadge';
import RPTimeline from '../components/RPTimeline';
import type { RequisicionRP } from '../types/requisicion.types';
import { getDetalleRequisicion, agregarComentario } from '../services/requisicionService';

interface Props {
  requisicionId: number;
  onBack: () => void;
}

const Fila: React.FC<{ label: string; valor?: string | number | null }> = ({ label, valor }) => (
  <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
    <Text variant="caption" color="secondary">{label}</Text>
    <Text variant="body" className="font-medium">{valor || '—'}</Text>
  </div>
);

const DetalleRequisicion: React.FC<Props> = ({ requisicionId, onBack }) => {
  const [req, setReq] = useState<RequisicionRP | null>(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const cargar = () => {
    setLoading(true);
    getDetalleRequisicion(requisicionId)
      .then(setReq)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [requisicionId]);

  const handleComentario = async () => {
    if (!comentario.trim() || !req) return;
    setEnviandoComentario(true);
    try {
      await agregarComentario(requisicionId, comentario, 'Usuario', 'usuario@refridcol.com');
      setComentario('');
      cargar();
    } finally {
      setEnviandoComentario(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  );
  if (!req) return <Text color="secondary">Requisición no encontrada.</Text>;

  const formatCOP = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return `$${val.toLocaleString('de-DE')}`;
  };

  const salarioFormateado = formatCOP(req.salario_asignado);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
          <div>
            <div className="flex items-center gap-3">
              <Title variant="h4" weight="bold" className="font-mono bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                {req.rp || 'Sin número RP'}
              </Title>
              <RPStatusBadge estado={req.estado} />
            </div>
            <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
              RECURSOS HUMANOS / DETALLE DE SOLICITUD
            </Text>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-sm space-y-1 shadow-sm">
        <Text color="secondary">
          Solicitado por: <strong>{req.nombre_solicitante}</strong> ({req.correo_solicitante})
        </Text>
        <Text variant="caption" color="secondary" className="block">
          Radicado: {req.fecha_radicacion ? new Date(req.fecha_radicacion).toLocaleDateString('es-CO') : '—'}
        </Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sección 1 */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <Title variant="h6" weight="bold" className="mb-4 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
              Datos Generales
            </Title>
            <Fila label="Ubicación" valor={req.departamento && req.municipio ? `${req.departamento} — ${req.municipio}` : '—'} />
            <Fila label="OT" valor={req.ot} />
            <Fila label="Obra / Proyecto" valor={req.nombre_obra_proyecto} />
            <Fila label="Dirección" valor={req.direccion_obra_proyecto} />
            <Fila label="Encargado en sitio" valor={req.encargado_sitio} />
            <Fila label="N° personas requeridas" valor={req.numero_personas_requeridas} />
            <Fila label="TSA" valor={req.tsa} />
            <Fila label="Duración" valor={req.duracion_obra_contrato} />
            <Fila label="Fecha probable ingreso" valor={req.fecha_probable_ingreso} />
            <Fila label="Centro de costo" valor={req.centro_costo} />
          </div>

          {/* Perfil requerido */}
          {req.perfil_requerido && (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
              <Title variant="h6" weight="bold" className="mb-3 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
                Perfil Requerido
              </Title>
              <Text variant="body" className="whitespace-pre-wrap">{req.perfil_requerido}</Text>
            </div>
          )}

          {/* Área, cargo, causal */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <Title variant="h6" weight="bold" className="mb-4 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
              Área, Cargo y Causal
            </Title>
            <Fila label="Área" valor={req.area_nombre} />
            <Fila label="Cargo" valor={req.cargo_nombre} />
            <Fila label="Causal" valor={req.causal_requisicion} />
            {req.otra_causal && <Fila label="Detalle causal" valor={req.otra_causal} />}
          </div>

          {/* Contratación */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <Title variant="h6" weight="bold" className="mb-4 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
              Contratación
            </Title>
            <Fila label="Salario" valor={salarioFormateado} />
            <Fila label="Horas extras" valor={req.horas_extras} />
            <Fila label="Modalidad" valor={req.modalidad_contratacion} />
            <Fila label="Tipo de contrato" valor={req.tipo_contratacion} />
            <Fila label="Auxilio movilización" valor={formatCOP(req.auxilio_movilizacion)} />
            <Fila label="Auxilio alimentación" valor={formatCOP(req.auxilio_alimentacion)} />
            <Fila label="Auxilio vivienda" valor={formatCOP(req.auxilio_vivienda)} />
          </div>

          {/* Equipos */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <Title variant="h6" weight="bold" className="mb-4 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
              Equipos y Dotación
            </Title>
            <Fila label="Equipos de oficina" valor={req.equipos_oficina?.map(e => e.equipo).join(', ') || '—'} />
            <Fila label="Equipos tecnológicos" valor={req.equipos_tecnologicos?.map(e => e.equipo).join(', ') || '—'} />
            <Fila label="SIMCARD" valor={req.requiere_simcard === 'SI' ? `Sí — ${req.tipo_plan_simcard}` : 'No'} />
            <Fila label="Programas especiales" valor={req.programas_especiales || (req.requiere_programas_especiales === 'NO' ? 'No' : undefined)} />
          </div>

          {/* Comentarios */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-[var(--color-primary)]" />
              <Title variant="h6" weight="bold" className="text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
                Comentarios
              </Title>
            </div>
            {req.comentarios?.map(c => (
              <div key={c.id} className="mb-3 p-3 bg-[var(--color-surface-secondary)] rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <Text variant="caption" className="font-semibold">{c.usuario_nombre}</Text>
                  <Text variant="caption" color="secondary">{c.fecha_comentario ? new Date(c.fecha_comentario).toLocaleString('es-CO') : ''}</Text>
                </div>
                <Text variant="body">{c.comentario}</Text>
              </div>
            ))}
            <div className="flex gap-2 mt-3 items-end">
              <div className="flex-1">
                <Input
                  className="!mb-0"
                  placeholder="Escribir comentario..."
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComentario(); } }}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleComentario}
                disabled={enviandoComentario || !comentario.trim()}
                loading={enviandoComentario}
                icon={Send}
              />
            </div>
          </div>
        </div>

        {/* Columna lateral — historial + aprobador */}
        <div className="space-y-5">
          {req.aprobador_nombre && (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5">
              <Title variant="h6" weight="bold" className="mb-3 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
                Aprobador Asignado
              </Title>
              <Text variant="body" className="font-semibold">{req.aprobador_nombre}</Text>
              <Text variant="caption" color="secondary">{req.aprobador_email}</Text>
              {req.observacion_aprobador && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <Text variant="caption" className="text-amber-800 italic">"{req.observacion_aprobador}"</Text>
                </div>
              )}
            </div>
          )}

          {req.gerente_nombre && (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5">
              <Title variant="h6" weight="bold" className="mb-3 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
                Firma Gerencial
              </Title>
              <Text variant="body" className="font-semibold">{req.gerente_nombre}</Text>
              <Text variant="caption" color="secondary">{req.gerente_email}</Text>
              {req.observacion_gerente && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <Text variant="caption" className="text-indigo-800 italic font-medium">"{req.observacion_gerente}"</Text>
                </div>
              )}
            </div>
          )}

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5">
            <Title variant="h6" weight="bold" className="mb-4 text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">
              Historial de Eventos
            </Title>
            <RPTimeline historial={req.historial || []} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleRequisicion;
