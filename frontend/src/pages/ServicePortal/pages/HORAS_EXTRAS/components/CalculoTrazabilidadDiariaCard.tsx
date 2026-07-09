import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge, MaterialCard, Text } from '../../../../../components/atoms';
import type { CalculoDiarioDetalle, DetalleDiarioEstado } from '../../../../../types/horasExtrasTrazabilidad';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);

const DIA_LABEL: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const mutedText = 'text-[var(--color-text-secondary)]';

interface Props {
  estado: DetalleDiarioEstado;
  detalle: CalculoDiarioDetalle[];
}

const estadoInfo = (estado: DetalleDiarioEstado) => {
  if (estado === 'DISPONIBLE') {
    return {
      icon: CheckCircle2,
      className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      texto: 'Snapshot diario disponible para auditoría.',
    };
  }
  if (estado === 'INCOMPLETO') {
    return {
      icon: AlertTriangle,
      className: 'bg-red-50 border-red-200 text-red-800',
      texto: 'Snapshot diario incompleto. Este cálculo requiere revisión.',
    };
  }
  return {
    icon: AlertTriangle,
    className: 'bg-amber-50 border-amber-200 text-amber-800',
    texto: 'Cálculo histórico sin snapshot diario; fue confirmado antes de esta mejora.',
  };
};

const CalculoTrazabilidadDiariaCard: React.FC<Props> = ({ estado, detalle }) => {
  const info = estadoInfo(estado);
  const Icon = info.icon;

  return (
    <MaterialCard className="p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <Text className="font-medium !m-0">Trazabilidad diaria</Text>
        <Badge>{estado}</Badge>
      </div>

      <div className={`p-3 border rounded flex items-start gap-2 mb-4 ${info.className}`} role="status">
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <Text className="text-sm !m-0">{info.texto}</Text>
      </div>

      {detalle.length === 0 ? (
        <Text className={`${mutedText} text-sm`}>No hay detalle diario para mostrar.</Text>
      ) : (
        <div className="space-y-3">
          {detalle.map((dia) => (
            <div
              key={`${dia.fecha}-${dia.codigo_calculado || 'sin-concepto'}`}
              className="border border-slate-200 dark:border-neutral-700 rounded-lg p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <Text className="font-medium !m-0">{DIA_LABEL[dia.dia_semana] || `Día ${dia.dia_semana}`}</Text>
                  <Text className={`text-xs ${mutedText} !m-0`}>{dia.fecha}</Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dia.codigo_calculado && <Badge>{dia.codigo_calculado}</Badge>}
                  {dia.es_festivo && <Badge>Festivo</Badge>}
                  {dia.es_domingo && <Badge>Domingo</Badge>}
                  {dia.novedad_codigo && <Badge>{dia.novedad_codigo}</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <Text className={`text-xs ${mutedText} !m-0`}>Horario</Text>
                  <Text className="!m-0">{dia.hora_entrada || '—'} → {dia.hora_salida || '—'}</Text>
                </div>
                <div>
                  <Text className={`text-xs ${mutedText} !m-0`}>Almuerzo</Text>
                  <Text className="!m-0">{dia.minutos_almuerzo} min</Text>
                </div>
                <div>
                  <Text className={`text-xs ${mutedText} !m-0`}>Horas</Text>
                  <Text className="!m-0">{dia.horas_trabajadas}h / {dia.horas_extras}h HE</Text>
                </div>
                <div>
                  <Text className={`text-xs ${mutedText} !m-0`}>Fuente</Text>
                  <Text className="!m-0">{dia.fuente_horario}</Text>
                </div>
                <div>
                  <Text className={`text-xs ${mutedText} !m-0`}>Costo</Text>
                  <Text className="!m-0">{fmtCurrency(dia.costo_total)}</Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </MaterialCard>
  );
};

export default CalculoTrazabilidadDiariaCard;
