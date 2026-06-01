import React, { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle, XCircle, Briefcase, Archive, Plus, List, ThumbsUp, ArrowLeft } from 'lucide-react';
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
    getDashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summaryCards = [
    {
      label: 'Borrador / Ajustes',
      count: (dashboard?.por_estado['BORRADOR'] || 0) + (dashboard?.por_estado['DEVUELTA_AJUSTE'] || 0),
      colores: { bg: 'bg-slate-100 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800', text: 'text-slate-700 dark:text-slate-350', dot: 'bg-slate-400' },
      icon: Archive
    },
    {
      label: 'Pendiente Aprobación',
      count: (dashboard?.por_estado['PENDIENTE_APROBACION'] || 0) + (dashboard?.por_estado['PENDIENTE_APROBACION_GERENCIA'] || 0),
      colores: ESTADO_COLORES['PENDIENTE_APROBACION'],
      icon: Clock
    },
    {
      label: 'Aprobadas',
      count: dashboard?.por_estado['APROBADA'] || 0,
      colores: ESTADO_COLORES['APROBADA'],
      icon: CheckCircle
    },
    {
      label: 'Rechazadas',
      count: dashboard?.por_estado['RECHAZADA'] || 0,
      colores: ESTADO_COLORES['RECHAZADA'],
      icon: XCircle
    },
    {
      label: 'En Selección',
      count: dashboard?.por_estado['EN_PROCESO_SELECCION'] || 0,
      colores: ESTADO_COLORES['EN_PROCESO_SELECCION'],
      icon: Users
    },
    {
      label: 'Cerradas / Canceladas',
      count: (dashboard?.por_estado['CERRADA'] || 0) + (dashboard?.por_estado['CANCELADA'] || 0),
      colores: ESTADO_COLORES['CERRADA'],
      icon: Archive
    }
  ];

  const userRole = (user?.rol || user?.role || '').toLowerCase();
  const permissions: string[] = user?.permissions || [];
  const esAprobador = ['admin', 'director'].includes(userRole) || permissions.includes('requisicion_aprobador');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <Button
          variant="ghost"
          onClick={onVolver}
          icon={ArrowLeft}
          className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl"
        />
        <div>
          <Title
            variant="h4"
            weight="bold"
            className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400"
          >
            Requisición de Personal
          </Title>
          <Text
            variant="caption"
            color="text-secondary"
            className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1"
          >
            PORTAL DE SERVICIOS / RECURSOS HUMANOS
          </Text>
        </div>
      </div>

      {/* Resumen de Gestión y Acciones Rápidas */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 flex flex-wrap gap-3 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Acciones Rápidas (Izquierda) */}
          <div className="lg:col-span-8 flex flex-wrap items-center gap-3">
            <Button
              onClick={onNueva}
              variant="primary"
              icon={Plus}
              className="px-6 py-3 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all font-bold h-12"
            >
              Nueva Requisición
            </Button>
            <Button
              onClick={onMisRequisiciones}
              variant="outline"
              icon={List}
              className="px-6 py-3 rounded-xl bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold h-12 text-slate-700 dark:text-slate-350"
            >
              Mis Solicitudes
            </Button>
            {esAprobador && (
              <Button
                onClick={onAprobaciones}
                variant="outline"
                icon={ThumbsUp}
                className="px-6 py-3 rounded-xl bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold h-12 text-slate-700 dark:text-slate-350"
              >
                Aprobaciones
              </Button>
            )}
          </div>

          {/* Total de Requisiciones (Derecha) */}
          <div className="lg:col-span-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-slate-850 dark:border-indigo-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <Text variant="caption" className="block font-bold uppercase tracking-wider text-white/50 leading-none">
                  Total Requisiciones
                </Text>
                <Text variant="caption" className="block text-[11px] text-white/70 mt-1 leading-none truncate">
                  Solicitudes registradas
                </Text>
              </div>
            </div>
            <div className="text-3xl font-black text-white pr-2 shrink-0">
              {dashboard ? dashboard.total : 0}
            </div>
          </div>
        </div>
      )}

      {/* Métricas por estado */}
      {!loading && dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summaryCards.map(({ label, count, colores, icon: Icon }) => (
            <div
              key={label}
              className={`rounded-2xl p-5 ${colores.bg} border border-transparent flex flex-col items-center justify-center text-center gap-2 shadow-sm`}
            >
              <Icon className={`w-6 h-6 mb-2 ${colores.text}`} />
              <div className={`text-3xl font-black ${colores.text} leading-none`}>
                {count}
              </div>
              <Text
                variant="caption"
                align="center"
                className={`mt-2 font-bold uppercase tracking-wider ${colores.text}`}
              >
                {label}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardRP;
