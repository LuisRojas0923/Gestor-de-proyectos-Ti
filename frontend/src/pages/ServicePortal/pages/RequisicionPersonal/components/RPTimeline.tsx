// Timeline de historial para una Requisición de Personal
import React from 'react';
import { CheckCircle, XCircle, RotateCcw, Clock, Send, Archive, UserCheck } from 'lucide-react';
import { HistorialItem, EstadoRP } from '../types/requisicion.types';
import { Text } from '../../../../../components/atoms';

interface RPTimelineProps {
  historial: HistorialItem[];
}

const iconoEstado = (estado: string) => {
  switch (estado as EstadoRP) {
    case 'APROBADA':               return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case 'RECHAZADA':              return <XCircle className="w-4 h-4 text-red-500" />;
    case 'DEVUELTA_AJUSTE':        return <RotateCcw className="w-4 h-4 text-orange-500" />;
    case 'PENDIENTE_APROBACION':   return <Clock className="w-4 h-4 text-amber-500" />;
    case 'BORRADOR':               return <Archive className="w-4 h-4 text-slate-400" />;
    case 'EN_PROCESO_SELECCION':   return <UserCheck className="w-4 h-4 text-blue-500" />;
    case 'CERRADA': case 'CANCELADA': return <XCircle className="w-4 h-4 text-gray-400" />;
    default:                       return <Send className="w-4 h-4 text-indigo-500" />;
  }
};

const formatFecha = (fecha: string | null) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const RPTimeline: React.FC<RPTimelineProps> = ({ historial }) => {
  if (!historial.length) {
    return (
      <Text variant="caption" color="secondary" className="italic py-4 text-center">
        Sin eventos registrados aún.
      </Text>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {historial.map((evento, idx) => (
          <li key={evento.id}>
            <div className="relative pb-8">
              {idx < historial.length - 1 && (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-[var(--color-border)]" />
              )}
              <div className="relative flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] ring-2 ring-[var(--color-border)]">
                  {iconoEstado(evento.estado_nuevo)}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <Text variant="body" className="font-semibold text-[var(--color-text-primary)]">
                      {evento.estado_nuevo.replace(/_/g, ' ')}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {formatFecha(evento.fecha_evento)}
                    </Text>
                  </div>
                  <Text variant="caption" color="secondary">
                    Por: <strong>{evento.usuario_nombre}</strong>
                  </Text>
                  {evento.observacion && (
                    <div className="mt-1 rounded-md bg-[var(--color-surface-secondary)] px-3 py-2">
                      <Text variant="caption" color="secondary" className="italic">
                        "{evento.observacion}"
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RPTimeline;
