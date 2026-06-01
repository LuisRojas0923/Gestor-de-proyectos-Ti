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

const DashboardRP: React.FC<Props> = ({ user, onNueva, onMisRequisiciones, onAprobaciones, onVolver }) => {
  const [dashboard, setDashboard] = useState<DashboardRP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const estadosPrincipales = [
    'PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA', 'EN_PROCESO_SELECCION', 'CERRADA'
  ];

  const userRole = (user?.rol || user?.role || '').toLowerCase();
  const permissions: string[] = user?.permissions || [];
  const esAprobador = ['admin', 'director'].includes(userRole) || permissions.includes('requisicion_aprobador');

  const acciones = [
    { label: 'Nueva Requisición', icon: Plus, action: onNueva, variant: 'primary' as const, className: 'h-auto py-6 rounded-2xl shadow-sm' },
    { label: 'Mis Solicitudes', icon: List, action: onMisRequisiciones, variant: 'outline' as const, className: 'h-auto py-6 rounded-2xl bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm hover:bg-[var(--color-surface-secondary)]' },
  ];

  if (esAprobador) {
    acciones.push({
      label: 'Aprobaciones',
      icon: ThumbsUp,
      action: onAprobaciones,
      variant: 'outline' as const,
      className: 'h-auto py-6 rounded-2xl bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm hover:bg-[var(--color-surface-secondary)]'
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
        <div>
          <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Requisición de Personal
          </Title>
          <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
            PORTAL DE SERVICIOS / RECURSOS HUMANOS
          </Text>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className={`grid grid-cols-1 md:grid-cols-${acciones.length} gap-4`}>
        {acciones.map(({ label, icon: Icon, action, variant, className }) => (
          <Button
            key={label}
            onClick={action}
            variant={variant}
            className={`${className} flex flex-col items-center justify-center gap-3`}
          >
            <Icon className="w-6 h-6 shrink-0 text-current" />
            <Text className="font-semibold text-sm text-current leading-none">{label}</Text>
          </Button>
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
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <Text variant="caption" color="secondary" className="block uppercase tracking-wider font-bold">Total de requisiciones</Text>
              <Title variant="h3" weight="bold" className="mt-1">{dashboard.total}</Title>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {estadosPrincipales.map(estado => {
              const count = dashboard.por_estado[estado] || 0;
              const colores = ESTADO_COLORES[estado as any] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
              const Icon = ICONOS[estado] || Archive;
              return (
                <div key={estado} className={`rounded-2xl p-5 ${colores.bg} border border-transparent flex flex-col items-center justify-center text-center gap-2 shadow-sm`}>
                  <Icon className={`w-6 h-6 mb-2 ${colores.text}`} />
                  <div className={`text-3xl font-black ${colores.text} leading-none`}>{count}</div>
                  <Text variant="caption" className={`mt-2 font-bold uppercase tracking-wider ${colores.text}`}>
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
