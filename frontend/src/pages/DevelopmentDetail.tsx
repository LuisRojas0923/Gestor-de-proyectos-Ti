import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import { Button, Title, Text } from '../components/atoms';
import EditDevelopmentModal from './MyDevelopments/EditDevelopmentModal';
import { ExternalLink, User, Shield, Briefcase, MapPin, Calendar, CalendarCheck, Layers, Activity, Pencil } from 'lucide-react';
import WbsTab, { WbsTabRef } from './DevelopmentDetail/WbsTab';

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('pendiente')) return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
  if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
  if (s.includes('complet')) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
  if (s.includes('cancel')) return 'text-neutral-600 bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
  return 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
};

const getDerivedStatus = (dev: DevelopmentWithCurrentStatus & { porcentaje_progreso?: number; estado_general?: string }): string =>
  (dev as { estado_general?: string }).estado_general ?? 'Pendiente';

const formatDate = (d?: string) => {
  if (!d) return null;
  const parts = d.split('T')[0].split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

type ApiDevelopment = DevelopmentWithCurrentStatus & {
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  tipo?: string;
  ambiente?: string;
  enlace_portal?: string;
  estado_general?: DevelopmentWithCurrentStatus['general_status'];
  fecha_inicio?: string;
  fecha_estimada_fin?: string;
  proveedor?: string;
  autoridad?: string;
  responsable?: string;
};

const normalizeDevelopment = (development: ApiDevelopment): DevelopmentWithCurrentStatus => ({
  ...development,
  name: development.name || development.nombre || '',
  description: development.description || development.descripcion,
  module: development.module || development.modulo,
  type: development.type || development.tipo,
  environment: development.environment || development.ambiente,
  portal_link: development.portal_link || development.enlace_portal,
  general_status: development.general_status || development.estado_general || 'Pendiente',
  start_date: development.start_date || development.fecha_inicio,
  estimated_end_date: development.estimated_end_date || development.fecha_estimada_fin,
  provider: development.provider || development.proveedor,
  authority: development.authority || development.autoridad,
  responsible: development.responsible || development.responsable,
});


const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/service-portal');
  const { darkMode } = useAppContext().state;
  const { get } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();
  const wbsRef = useRef<WbsTabRef>(null);

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [editTarget, setEditTarget] = useState<DevelopmentWithCurrentStatus | null>(null);

  useEffect(() => {
    get('/jerarquia/usuarios-disponibles').then((users: unknown) => {
      if (Array.isArray(users)) {
        setUserMap(new Map((users as { id: string; nombre: string }[]).map((u) => [u.id, u.nombre])));
      }
    }).catch(() => undefined);
  }, [get]);

  const resolveUserName = (value?: string | null) => {
    if (!value) return undefined;
    if (value.startsWith('USR-')) return userMap.get(value) ?? value;
    return value;
  };

  const loadDevelopment = useCallback(async () => {
    if (!developmentId) return;
    setLoading(true);
    try {
      const dev = await get(API_ENDPOINTS.DEVELOPMENT_BY_ID(developmentId));
      if (dev) {
        setDevelopment(normalizeDevelopment(dev as ApiDevelopment));
      }
    } finally {
      setLoading(false);
    }
  }, [developmentId, get]);

  useEffect(() => {
    loadDevelopment();
  }, [loadDevelopment]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                onClick={() => navigate(isPortal ? '/service-portal/desarrollos' : '/developments')}
                className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
              >
                ← Volver
              </Button>
              {development?.id && (
                <Text as="span" variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50 text-center">
                  {development.id}
                </Text>
              )}
              {development && (
                <Text as="span" className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getStatusColor(getDerivedStatus(development))}`}>
                  <Activity size={11} />
                  {getDerivedStatus(development)}
                </Text>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <Title variant="h1" weight="bold" className="m-0 leading-tight">
                {development?.name || (loading ? 'Cargando...' : 'Proyecto')}
              </Title>
              {development?.description && (
                <Text variant="caption" color="text-secondary" className="mt-0.5" title={development.description}>
                  {development.description}
                </Text>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => setEditTarget(development)}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
              title="Editar proyecto"
            />
            {development?.portal_link && (
              <Button
                variant="outline"
                icon={ExternalLink}
                onClick={() => window.open(development.portal_link, '_blank', 'noopener,noreferrer')}
                className="h-10 text-xs border-green-500/30 text-green-600 hover:bg-green-500 hover:text-white"
              >
                Portal
              </Button>
            )}
          </div>
        </div>

        {development && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-neutral-50/50 dark:bg-neutral-800/20 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/50 space-y-2.5 md:col-span-2">
              <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider text-[10px]">
                Información General
              </Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {development.type && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <Briefcase size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Tipo:</Text>
                    <Text variant="caption" weight="medium">{development.type}</Text>
                  </Text>
                )}
                {development.area_desarrollo && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit max-w-full" title={development.area_desarrollo}>
                    <MapPin size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary" className="shrink-0">Área:</Text>
                    <Text variant="caption" weight="medium" className="truncate">{development.area_desarrollo}</Text>
                  </Text>
                )}
                {development.module && (
                  <Text as="span" className="inline-flex items-start gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit max-w-full" title={development.module}>
                    <Layers size={10} className="text-neutral-400 shrink-0 mt-0.5" />
                    <Text variant="caption" color="text-secondary" className="shrink-0">Proceso:</Text>
                    <Text variant="caption" weight="medium" className="line-clamp-2">{development.module}</Text>
                  </Text>
                )}
                {development.environment && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <Text variant="caption" color="text-secondary">Ambiente:</Text>
                    <Text variant="caption" weight="medium">{development.environment}</Text>
                  </Text>
                )}
                {development.provider && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <Text variant="caption" color="text-secondary">Proveedor:</Text>
                    <Text variant="caption" weight="medium">{development.provider}</Text>
                  </Text>
                )}
                {development.creado_por_id && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <User size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Creado por:</Text>
                    <Text variant="caption" weight="medium">{resolveUserName(development.creado_por_id) || development.creado_por_id}</Text>
                  </Text>
                )}
              </div>
            </div>

            <div className="bg-neutral-50/50 dark:bg-neutral-800/20 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/50 space-y-2.5 md:col-span-1">
              <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider text-[10px]">
                Fechas del Proyecto
              </Text>
              <div className="flex flex-col gap-1">
                {development.start_date && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <Calendar size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Inicio:</Text>
                    <Text variant="caption" weight="medium">{formatDate(development.start_date)}</Text>
                  </Text>
                )}
                {development.estimated_end_date && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <CalendarCheck size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Fin est.:</Text>
                    <Text variant="caption" weight="medium">{formatDate(development.estimated_end_date)}</Text>
                  </Text>
                )}
              </div>
            </div>

            <div className="bg-neutral-50/50 dark:bg-neutral-800/20 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/50 space-y-2.5 md:col-span-2">
              <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider text-[10px]">
                Personal Asignado
              </Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {development.authority && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <Shield size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Autoridad:</Text>
                    <Text variant="caption" weight="medium">{development.authority}</Text>
                  </Text>
                )}
                {development.responsible && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <User size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Líder:</Text>
                    <Text variant="caption" weight="medium">{development.responsible}</Text>
                  </Text>
                )}
                {development.supervisor && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <User size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Supervisor:</Text>
                    <Text variant="caption" weight="medium">{development.supervisor}</Text>
                  </Text>
                )}
                {development.analista && (
                  <Text as="span" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 w-fit">
                    <User size={10} className="text-neutral-400 shrink-0" />
                    <Text variant="caption" color="text-secondary">Ejecutor:</Text>
                    <Text variant="caption" weight="medium">{development.analista}</Text>
                  </Text>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {development && (
        <WbsTab ref={wbsRef} developmentId={development.id} darkMode={darkMode} />
      )}

      {editTarget && (
        <EditDevelopmentModal
          development={{
            id: editTarget.id,
            name: editTarget.name ?? editTarget.nombre,
            descripcion: editTarget.description ?? editTarget.descripcion,
            modulo: editTarget.modulo,
            tipo: editTarget.tipo,
            fecha_inicio: editTarget.start_date ?? editTarget.fecha_inicio,
            fecha_estimada_fin: editTarget.estimated_end_date ?? editTarget.fecha_estimada_fin,
            autoridad: editTarget.authority ?? editTarget.autoridad,
            autoridad_id: editTarget.authority_id,
            responsible: editTarget.responsible ?? editTarget.responsable,
            responsible_id: editTarget.responsible_id,
            analista: editTarget.analista,
            analista_id: editTarget.analista_id,
            supervisor: editTarget.supervisor,
            area_desarrollo: editTarget.area_desarrollo,
            area_ejecutor: editTarget.area_ejecutor,
          }}
          onClose={() => setEditTarget(null)}
          onSaved={() => { loadDevelopment(); setEditTarget(null); }}
        />
      )}
    </div>
  );
};

export default DevelopmentDetail;
