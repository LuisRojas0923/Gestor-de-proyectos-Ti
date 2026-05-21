import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import { Button, Title, Text } from '../components/atoms';
import { Plus, ExternalLink, User, Shield, Briefcase, MapPin, Calendar, CalendarCheck, Layers, Activity } from 'lucide-react';
import WbsTab, { WbsTabRef } from './DevelopmentDetail/WbsTab';

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('pendiente')) return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
  if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
  if (s.includes('complet')) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
  if (s.includes('cancel')) return 'text-neutral-600 bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
  return 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
};

const getDerivedStatus = (dev: DevelopmentWithCurrentStatus & { porcentaje_progreso?: number }): string => {
  const progress = Number(dev.stage_progress_percentage ?? dev.porcentaje_progreso ?? 0);
  if (progress >= 100) return 'Completado';
  if (progress > 0) return 'En proceso';
  return 'Pendiente';
};

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

  // Cargar usuarios para resolver nombres
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

  // Cargar desarrollo
  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, [developmentId, get]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-3">
        {/* Top row */}
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
            </div>
            <div className="flex flex-col min-w-0">
              <Title variant="h1" weight="bold" className="m-0 leading-tight">
                {development?.name || (loading ? 'Cargando...' : 'Proyecto')}
              </Title>
              {development?.description && (
                <Text variant="caption" color="text-secondary" className="line-clamp-2 max-w-2xl mt-0.5" title={development.description}>
                  {development.description}
                </Text>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
            <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => wbsRef.current?.handleAddRootTask()}
              className="h-10 text-xs shadow-lg shadow-primary-500/20"
            >
              Tarea
            </Button>
          </div>
        </div>

        {/* Metadata chips */}
        {development && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex flex-wrap gap-2">
            {/* Estado */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getStatusColor(getDerivedStatus(development))}`}>
              <Activity size={11} />
              {getDerivedStatus(development)}
            </span>

            {/* Tipo */}
            {development.type && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Briefcase size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Tipo:</span>
                <span className="font-medium">{development.type}</span>
              </span>
            )}

            {/* Área */}
            {development.area_desarrollo && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <MapPin size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Área:</span>
                <span className="font-medium">{development.area_desarrollo}</span>
              </span>
            )}

            {/* Proceso/módulo */}
            {development.module && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Layers size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Proceso:</span>
                <span className="font-medium">{development.module}</span>
              </span>
            )}

            {/* Autoridad */}
            {development.authority && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Shield size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Autoridad:</span>
                <span className="font-medium">{development.authority}</span>
              </span>
            )}

            {/* Líder (was Responsable) */}
            {development.responsible && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <User size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Líder:</span>
                <span className="font-medium">{development.responsible}</span>
              </span>
            )}

            {/* Supervisor */}
            {development.supervisor && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <User size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Supervisor:</span>
                <span className="font-medium">{development.supervisor}</span>
              </span>
            )}

            {/* Ejecutor (was Analista / Líder) */}
            {development.analista && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <User size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Ejecutor:</span>
                <span className="font-medium">{development.analista}</span>
              </span>
            )}

            {/* Fecha inicio */}
            {development.start_date && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Calendar size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Inicio:</span>
                <span className="font-medium">{formatDate(development.start_date)}</span>
              </span>
            )}

            {/* Fecha estimada fin */}
            {development.estimated_end_date && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <CalendarCheck size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Fin est.:</span>
                <span className="font-medium">{formatDate(development.estimated_end_date)}</span>
              </span>
            )}

            {/* Ambiente */}
            {development.environment && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <span className="text-neutral-400">Ambiente:</span>
                <span className="font-medium">{development.environment}</span>
              </span>
            )}

            {/* Proveedor */}
            {development.provider && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <span className="text-neutral-400">Proveedor:</span>
                <span className="font-medium">{development.provider}</span>
              </span>
            )}

            {/* Creador */}
            {development.creado_por_id && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <User size={11} className="text-neutral-400" />
                <span className="text-neutral-400">Creado por:</span>
                <span className="font-medium">{resolveUserName(development.creado_por_id) || development.creado_por_id}</span>
              </span>
            )}
          </div>
        )}
      </div>



      {development && (
        <WbsTab ref={wbsRef} developmentId={development.id} darkMode={darkMode} />
      )}

    </div>
  );
};

export default DevelopmentDetail;
