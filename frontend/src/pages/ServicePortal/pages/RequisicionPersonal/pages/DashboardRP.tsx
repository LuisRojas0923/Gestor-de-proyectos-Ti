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

  const estadosPrincipales = [
    'PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA', 'EN_PROCESO_SELECCION', 'CERRADA'
  ];

  const userRole = (user?.rol || user?.role || '').toLowerCase();
  const permissions: string[] = user?.permissions || [];
  const esAprobador = ['admin', 'director'].includes(userRole) || permissions.includes('requisicion_aprobador');

  const gridColsClass = esAprobador
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
    : 'grid grid-cols-1 sm:grid-cols-3 gap-6';

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
        <div className={gridColsClass}>
          {Array.from({ length: esAprobador ? 4 : 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse border border-[var(--color-border)]"
            />
          ))}
        </div>
      ) : (
        <div className={gridColsClass}>
          {/* Card: Nueva Requisición */}
          <button
            onClick={onNueva}
            className="group p-6 rounded-2xl border text-left flex flex-col justify-between h-40 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-[var(--color-primary-900)] to-[var(--color-primary-700)] text-white border-transparent"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <Title variant="subtitle1" weight="bold" color="white" className="leading-tight">
                Nueva Requisición
              </Title>
              <Text variant="caption" className="block mt-1 font-medium text-white/70 leading-tight">
                Crear una nueva solicitud de contratación de personal
              </Text>
            </div>
          </button>

          {/* Card: Mis Solicitudes */}
          <button
            onClick={onMisRequisiciones}
            className="group p-6 rounded-2xl border text-left flex flex-col justify-between h-40 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 text-[var(--color-primary)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <List className="w-5 h-5" />
            </div>
            <div>
              <Title variant="subtitle1" weight="bold" className="leading-tight text-slate-800 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                Mis Solicitudes
              </Title>
              <Text variant="caption" color="text-secondary" className="block mt-1 font-medium leading-tight">
                Ver el historial y estado de tus requisiciones
              </Text>
            </div>
          </button>

          {/* Card: Aprobaciones (Solo Directores / Aprobadores) */}
          {esAprobador && (
            <button
              onClick={onAprobaciones}
              className="group p-6 rounded-2xl border text-left flex flex-col justify-between h-40 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ThumbsUp className="w-5 h-5" />
              </div>
              <div>
                <Title variant="subtitle1" weight="bold" className="leading-tight text-slate-800 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                  Aprobaciones
                </Title>
                <Text variant="caption" color="text-secondary" className="block mt-1 font-medium leading-tight">
                  Firmar o devolver solicitudes de personal pendientes
                </Text>
              </div>
            </button>
          )}

          {/* Card: Total de Requisiciones */}
          <div className="group p-6 rounded-2xl border text-left flex flex-col justify-between h-40 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border-transparent shadow-md">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-white leading-none tracking-tight">
                {dashboard ? dashboard.total : 0}
              </div>
            </div>
            <div>
              <Text variant="caption" className="block font-bold uppercase tracking-wider text-white/50 leading-none mb-1">
                Total de Requisiciones
              </Text>
              <Text variant="caption" className="block font-medium text-white/70 leading-tight">
                Historial acumulado de solicitudes registradas
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Métricas por estado */}
      {!loading && dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {estadosPrincipales.map((estado) => {
            const count = dashboard.por_estado[estado] || 0;
            const colores = ESTADO_COLORES[estado as any] ?? {
              bg: 'bg-gray-100',
              text: 'text-gray-600',
              dot: 'bg-gray-400',
            };
            const Icon = ICONOS[estado] || Archive;
            return (
              <div
                key={estado}
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
                  {ESTADO_LABELS[estado as any] ?? estado}
                </Text>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardRP;
