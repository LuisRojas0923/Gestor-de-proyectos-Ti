// Detalle completo de una Requisición de Personal
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, MapPin, Layers, DollarSign, Package, Printer } from 'lucide-react';
import { Button, Title, Text } from '../../../../../components/atoms';
import RPStatusBadge from '../components/RPStatusBadge';
import RPTimeline from '../components/RPTimeline';
import type { RequisicionRP } from '../types/requisicion.types';
import { getDetalleRequisicion } from '../services/requisicionService';

interface Props {
  requisicionId: number;
  onBack: () => void;
}

const SummaryItem = ({ label, value, highlight = false, className = '' }: { label: string; value: React.ReactNode; highlight?: boolean; className?: string }) => {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-neutral-800/50'} ${className}`}>
      <Text variant="caption" className="text-slate-500 dark:text-slate-400 font-medium mb-1 block uppercase text-[10px] tracking-wider">{label}</Text>
      <Text variant="body2" className={`font-semibold ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
        {value || <Text as="span" color="inherit" className="text-slate-400 italic font-normal">—</Text>}
      </Text>
    </div>
  );
};

const DetalleRequisicion: React.FC<Props> = ({ requisicionId, onBack }) => {
  const [req, setReq] = useState<RequisicionRP | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    getDetalleRequisicion(requisicionId)
      .then(setReq)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requisicionId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  );
  if (!req) return <Text color="primary">Requisición no encontrada.</Text>;

  const formatCOP = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return `$${val.toLocaleString('de-DE')}`;
  };

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Bogota',
    });
  };

  const salarioFormateado = formatCOP(req.salario_asignado);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 detalle-req-view">
      <style>
        {`
          .detalle-req-view .text-base { font-size: 14px; }
          .detalle-req-view .text-sm { font-size: 12px; }
          .detalle-req-view .text-xs { font-size: 10px; }
          .detalle-req-view .text-\\[11px\\] { font-size: 9px; }
          .detalle-req-view .text-\\[10px\\] { font-size: 8px; }
          .detalle-req-view input, 
          .detalle-req-view select, 
          .detalle-req-view textarea { font-size: 12px; }
        `}
      </style>
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
        {/* Botón imprimir */}
        <Button variant="custom"
          onClick={() => window.open(`/service-portal/requisicion-personal/print/${requisicionId}`, '_blank')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-[var(--color-border)] bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all duration-150 shadow-sm"
          title="Imprimir Requisición"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </Button>
      </div>
      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* BLOQUE 1: DATOS GENERALES */}
            <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                <Title variant="subtitle2" weight="bold">Datos Generales y Ubicación</Title>
              </div>
              <div className="p-4 grid grid-cols-12 gap-3">
                <SummaryItem className="col-span-12 sm:col-span-5" label="Ubicación" value={req.departamento && req.municipio ? `${req.municipio}, ${req.departamento}` : '—'} />
                <SummaryItem className="col-span-12 sm:col-span-2" label="OT" value={req.ot} />
                <SummaryItem className="col-span-12 sm:col-span-5" label="Nombre Obra / Proyecto" value={req.nombre_obra_proyecto} />
                
                <SummaryItem className="col-span-12 sm:col-span-5" label="Dirección Obra" value={req.direccion_obra_proyecto} />
                <SummaryItem className="col-span-12 sm:col-span-5" label="Encargado en sitio" value={req.encargado_sitio} />
                <SummaryItem className="col-span-12 sm:col-span-2" label="N° Personas" value={req.numero_personas_requeridas} />
                
                <SummaryItem className="col-span-12 sm:col-span-4" label="TSA" value={req.tsa} />
                <SummaryItem className="col-span-12 sm:col-span-4" label="Duración" value={req.duracion_obra_contrato} />
                <SummaryItem className="col-span-12 sm:col-span-4" label="Fecha probable de ingreso" value={req.fecha_probable_ingreso} />
              </div>
            </div>

            {/* BLOQUE 2: ÁREA, CARGO Y PERFIL */}
            <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                <Title variant="subtitle2" weight="bold">Área, Cargo y Causal</Title>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <SummaryItem label="Centro de costo" value={req.centro_costo} />
                <SummaryItem label="Área" value={req.area_nombre} />
                
                <SummaryItem label="Cargo Solicitado" value={req.cargo_nombre} />
                <SummaryItem label="Causal de Requisición" value={req.causal_requisicion} />
                
                {req.otra_causal && (
                  <div className="col-span-2">
                    <SummaryItem label="Otra causal" value={req.otra_causal} />
                  </div>
                )}
                
                <div className="col-span-2">
                  <SummaryItem label="Perfil O" value={req.perfil_requerido} />
                </div>
              </div>
            </div>

            {/* BLOQUE 3: CONTRATACIÓN Y AUXILIOS */}
            <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
                <Title variant="subtitle2" weight="bold">Condiciones de Contratación y Auxilios</Title>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <SummaryItem label="Salario Asignado" value={salarioFormateado} />
                <SummaryItem label="¿Horas Extras?" value={req.horas_extras} />
                <SummaryItem label="Modalidad" value={req.modalidad_contratacion} />
                <SummaryItem label="Tipo de Contrato" value={req.tipo_contratacion} />
                <div className="col-span-2 grid grid-cols-3 gap-3 pt-2 border-t border-[var(--color-border)]">
                  <SummaryItem label="Movilización" value={formatCOP(req.auxilio_movilizacion)} />
                  <SummaryItem label="Alimentación" value={formatCOP(req.auxilio_alimentacion)} />
                  <SummaryItem label="Vivienda" value={formatCOP(req.auxilio_vivienda)} />
                </div>
              </div>
            </div>

            {/* BLOQUE 4: EQUIPOS Y DOTACIÓN */}
            <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--color-primary)]" />
                <Title variant="subtitle2" weight="bold">Equipos e Implementos</Title>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <SummaryItem label="Equipos de Oficina" value={req.equipos_oficina?.length ? req.equipos_oficina.map(e => e.equipo).join(', ') : 'NO REQUERIDO'} />
                </div>
                <div className="col-span-2">
                  <SummaryItem label="Equipos Tecnológicos" value={req.equipos_tecnologicos?.length ? req.equipos_tecnologicos.map(e => e.equipo).join(', ') : 'NO REQUERIDO'} />
                </div>
                <SummaryItem label="SIMCARD" value={req.requiere_simcard === 'SI' ? req.tipo_plan_simcard : 'NO'} />
                <SummaryItem label="Programas Especiales" value={req.requiere_programas_especiales === 'SI' ? req.programas_especiales : 'NO'} />
              </div>
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
              <Text variant="caption" color="primary">{req.aprobador_email}</Text>
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
              <Text variant="caption" color="primary">{req.gerente_email}</Text>
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
