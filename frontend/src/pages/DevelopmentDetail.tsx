import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import { Button, Title, Text, Badge } from '../components/atoms';
import { DevelopmentEditModal } from '../components/molecules';
import { Plus, Pencil, ExternalLink } from 'lucide-react';
import WbsTab, { WbsTabRef } from './DevelopmentDetail/WbsTab';

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

const toApiDevelopmentPayload = (data: Partial<ApiDevelopment>) => ({
  nombre: data.name,
  descripcion: data.description,
  modulo: data.module,
  tipo: data.type,
  ambiente: data.environment,
  enlace_portal: data.portal_link,
  estado_general: data.general_status,
  fecha_inicio: data.start_date,
  fecha_estimada_fin: data.estimated_end_date,
  proveedor: data.provider,
  autoridad: data.authority,
  responsable: data.responsible,
  area_desarrollo: data.area_desarrollo,
  analista: data.analista,
});

const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/service-portal');
  const { darkMode } = useAppContext().state;
  const { get, put } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();
  const wbsRef = useRef<WbsTabRef>(null);

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [developmentEditOpen, setDevelopmentEditOpen] = useState(false);

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

  const updateDevelopment = async (updatedData: Partial<ApiDevelopment>): Promise<boolean> => {
    if (!development) return false;
    try {
      const result = await put(API_ENDPOINTS.DEVELOPMENT_BY_ID(development.id), toApiDevelopmentPayload(updatedData));
      if (result) {
        setDevelopment(normalizeDevelopment(result as ApiDevelopment));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al actualizar el desarrollo:', error);
      return false;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(isPortal ? '/service-portal/desarrollos' : '/developments')}
            className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
          >
            ← Volver
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <Title variant="h1" weight="bold" className="m-0 leading-tight">
                {development?.name || (loading ? 'Cargando...' : 'Proyecto')}
              </Title>
              {development?.id && (
                <Text as="span" variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50">
                  {development.id}
                </Text>
              )}
            </div>
            {development?.description && (
              <Text variant="caption" color="text-secondary" className="line-clamp-1 max-w-2xl" title={development.description}>
                {development.description}
              </Text>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <Button
            variant="custom"
            onClick={() => setDevelopmentEditOpen(true)}
            disabled={loading || !development}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all border border-[var(--color-primary)]/20"
            title="Editar Proyecto"
          >
            <Pencil size={18} />
          </Button>
        </div>
      </div>



      {development && (
        <WbsTab ref={wbsRef} developmentId={development.id} darkMode={darkMode} />
      )}

      {development && (
        <DevelopmentEditModal
          isOpen={developmentEditOpen}
          development={development}
          onClose={() => setDevelopmentEditOpen(false)}
          onSave={updateDevelopment}
        />
      )}
    </div>
  );
};

export default DevelopmentDetail;
