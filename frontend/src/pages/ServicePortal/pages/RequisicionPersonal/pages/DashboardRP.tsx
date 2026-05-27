import React, { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle, XCircle, Briefcase, Archive, Plus, List, ThumbsUp, Settings, ArrowLeft } from 'lucide-react';
import { Button, Title, Text } from '../../../../../components/atoms';
import { getDashboard } from '../services/requisicionService';
import type { DashboardRP } from '../types/requisicion.types';
import { ESTADO_COLORES, ESTADO_LABELS } from '../types/requisicion.types';

interface Props {
  user: any;
  onNueva: () => void;
  onMisRequisiciones: () => void;
  onAprobaciones: () => void;
  onGestionHumana: () => void;
  onVolver: () => void;
}

const ICONOS: Record<string, React.ElementType> = {
  BORRADOR: Archive,
  PENDIENTE_APROBACION: Clock,
  DEVUELTA_AJUSTE: XCircle,
  APROBADA: CheckCircle,
  RECHAZADA: XCircle,
  EN_PROCESO_SELECCION: Users,
  CANDIDATO_SELECCIONADO: CheckCircle,
  EN_PROCESO_CONTRATACION: Briefcase,
  CERRADA: Archive,
  CANCELADA: XCircle,
};

const DashboardRP: React.FC<Props> = ({ user, onNueva, onMisRequisiciones, onAprobaciones, onGestionHumana, onVolver }) => {
  const [dashboard, setDashboard] = useState<DashboardRP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const estadosPrincipales = [
    'PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA', 'EN_PROCESO_SELECCION', 'CERRADA'
  ];

  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold p-0">
        Volver al Portal
      </Button>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 text-white">
        <Text variant="caption" className="text-blue-200 uppercase tracking-widest font-bold mb-1">
          Portal de Servicios — RRHH
        </Text>
        <Title variant="h3" weight="bold" color="white">Requisición de Personal</Title>
        <Text className="text-blue-200 mt-2">
          Gestione las solicitudes de contratación de personal de manera eficiente y trazable.
        </Text>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Nueva Requisición', icon: Plus, action: onNueva, color: 'bg-[var(--color-primary)] text-white hover:opacity-90' },
          { label: 'Mis Solicitudes', icon: List, action: onMisRequisiciones, color: 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]' },
          { label: 'Aprobaciones', icon: ThumbsUp, action: onAprobaciones, color: 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]' },
          { label: 'Gestión Humana', icon: Settings, action: onGestionHumana, color: 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]' },
        ].map(({ label, icon: Icon, action, color }) => (
          <button key={label} onClick={action}
            className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl font-semibold text-sm transition-all ${color}`}>
            <Icon className="w-6 h-6" />
            {label}
          </button>
        ))}
      </div>

      {/* Métricas por estado */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />
          ))}
        </div>
      ) : dashboard ? (
        <>
          {/* Total */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <Text variant="caption" color="secondary">Total de requisiciones</Text>
              <Title variant="h3" weight="bold">{dashboard.total}</Title>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {estadosPrincipales.map(estado => {
              const count = dashboard.por_estado[estado] || 0;
              const colores = ESTADO_COLORES[estado as any] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
              const Icon = ICONOS[estado] || Archive;
              return (
                <div key={estado} className={`rounded-2xl p-5 ${colores.bg} border border-transparent`}>
                  <Icon className={`w-5 h-5 mb-3 ${colores.text}`} />
                  <div className={`text-3xl font-black ${colores.text}`}>{count}</div>
                  <Text variant="caption" className={`mt-1 font-medium ${colores.text}`}>
                    {ESTADO_LABELS[estado as any] ?? estado}
                  </Text>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DashboardRP;
