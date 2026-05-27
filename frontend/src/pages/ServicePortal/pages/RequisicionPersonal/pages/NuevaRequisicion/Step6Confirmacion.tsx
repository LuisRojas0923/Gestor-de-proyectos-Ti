// Paso 6: Confirmación y declaración final
import React from 'react';
import { CheckSquare, AlertCircle } from 'lucide-react';
import { Title, Text } from '../../../../../../components/atoms';
import type { FormularioRP } from '../../types/requisicion.types';
import RPStatusBadge from '../../components/RPStatusBadge';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  nombreSolicitante: string;
  correoSolicitante: string;
  areaNombre?: string;
  cargoNombre?: string;
  ciudadNombre?: string;
}

const Fila: React.FC<{ label: string; valor?: string | number | null }> = ({ label, valor }) => (
  <div className="flex items-start justify-between py-2 border-b border-[var(--color-border)] last:border-0">
    <Text variant="caption" color="secondary" className="min-w-[180px]">{label}</Text>
    <Text variant="body" className="text-right font-medium">{valor || '—'}</Text>
  </div>
);

const Step6Confirmacion: React.FC<Props> = ({
  form, update, nombreSolicitante, correoSolicitante, areaNombre, cargoNombre, ciudadNombre
}) => {
  const formatCOP = (valStr: string | null | undefined) => {
    if (!valStr) return '—';
    const clean = valStr.replace(/\D/g, '');
    return clean ? `$${Number(clean).toLocaleString('de-DE')}` : '—';
  };

  const salarioFormateado = formatCOP(form.salario_asignado);
  const movilizacionFormateado = formatCOP(form.auxilio_movilizacion);
  const alimentacionFormateado = formatCOP(form.auxilio_alimentacion);
  const viviendaFormateado = formatCOP(form.auxilio_vivienda);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <CheckSquare className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Resumen de la Requisición
        </Title>
      </div>

      <div className="rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-5 space-y-1">
        <Fila label="Solicitante" valor={nombreSolicitante} />
        <Fila label="Correo" valor={correoSolicitante} />
        <Fila label="Ciudad" valor={ciudadNombre} />
        <Fila label="Área" valor={areaNombre} />
        <Fila label="Cargo solicitado" valor={cargoNombre} />
        <Fila label="N° personas" valor={form.numero_personas_requeridas} />
        <Fila label="OT" valor={form.ot} />
        <Fila label="Obra / Proyecto" valor={form.nombre_obra_proyecto} />
        <Fila label="Fecha probable ingreso" valor={form.fecha_probable_ingreso} />
        <Fila label="Causal" valor={form.causal_requisicion} />
        <Fila label="Salario asignado" valor={salarioFormateado} />
        <Fila label="Auxilio de movilización" valor={movilizacionFormateado} />
        <Fila label="Auxilio de alimentación" valor={alimentacionFormateado} />
        <Fila label="Auxilio de vivienda" valor={viviendaFormateado} />
        <Fila label="Modalidad" valor={form.modalidad_contratacion} />
        <Fila label="Tipo de contrato" valor={form.tipo_contratacion} />
        <Fila label="TSA" valor={form.tsa} />
        <Fila label="Requiere SIMCARD" valor={form.requiere_simcard === 'SI' ? `Sí — ${form.tipo_plan_simcard}` : 'No'} />
        <Fila label="Equipos oficina"
          valor={form.necesita_equipos_oficina === 'SI' ? form.equipos_oficina.join(', ') : 'No'} />
        <Fila label="Equipos tecnológicos"
          valor={form.necesita_equipos_tecnologicos === 'SI' ? form.equipos_tecnologicos.join(', ') : 'No'} />
      </div>

      {/* Estado que tendrá */}
      <div className="flex items-center gap-3">
        <Text variant="body" color="secondary">Estado al enviar:</Text>
        <RPStatusBadge estado="PENDIENTE_APROBACION" />
      </div>

      {/* Declaración */}
      <div className={`rounded-2xl border-2 p-5 transition-colors cursor-pointer
        ${form.confirmacion
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}
        onClick={() => update('confirmacion', !form.confirmacion)}
      >
        <label className="flex items-start gap-4 cursor-pointer">
          <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
            ${form.confirmacion
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-[var(--color-border)]'}`}>
            {form.confirmacion && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <Text variant="body" className="font-semibold leading-snug">
              Declaro que la información registrada en esta requisición es correcta y autorizo su
              envío al flujo de aprobación correspondiente.
            </Text>
            <Text variant="caption" color="secondary" className="mt-1">
              Al enviar, se notificará al gerente aprobador de su área y no podrá editarla hasta
              que sea devuelta para ajuste.
            </Text>
          </div>
        </label>
      </div>

      {!form.confirmacion && (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <Text variant="caption" className="text-amber-700">
            Debe marcar la casilla de confirmación para poder enviar la requisición.
          </Text>
        </div>
      )}
    </div>
  );
};

export default Step6Confirmacion;
